#!/usr/bin/env node
// Migração dos dados do JSONBin antigo para Supabase.
// Uso: node scripts/migrate-from-bin.mjs
//
// Env vars esperadas:
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   BACKUP_FILE (default: C:/Users/kbarr/Temp/casa-monika/OLD-DATA-BACKUP.json)

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const BACKUP_FILE = process.env.BACKUP_FILE || 'C:/Users/kbarr/Temp/casa-monika/OLD-DATA-BACKUP.json'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const raw = JSON.parse(readFileSync(BACKUP_FILE, 'utf-8'))
const D = raw.record || raw

console.log(`📂 Backup carregado: ${BACKUP_FILE}`)
console.log(`   quick: ${D.quick.length} produtos`)
console.log(`   hist: ${D.hist.length} compras`)
console.log(`   izDays: ${D.izDays.length} dias de Zazá`)
console.log(`   izTasks: ${Object.keys(D.izTasks).join(', ')}`)
console.log(`   pets: ${Object.keys(D.pets).join(', ')}`)
console.log(`   notas: ${D.notas.length} notas fiscais`)

// ================== Helpers ==================

const categoryIcons = {
  'Carnes & Peixes': '🥩',
  'Hortifruti': '🥬',
  'Laticínios': '🥛',
  'Padaria': '🍞',
  'Bebidas': '🥤',
  'Limpeza': '🧽',
  'Higiene': '🧼',
  'Pets': '🐾',
  'Grãos & Cereais': '🍚',
  'Temperos & Condimentos': '🧂',
  'Outros': '📦'
}

function guessProductIcon(name) {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const map = {
    'lagarto': '🥩', 'fígado': '🥩', 'figado': '🥩', 'alcatra': '🥩', 'filé': '🥩', 'file': '🥩',
    'picanha': '🥩', 'carne': '🥩', 'bacon': '🥓', 'frango': '🍗', 'peixe': '🐟', 'salmão': '🐟',
    'salmao': '🐟', 'peito de frango': '🍗',
    'leite': '🥛', 'iogurte': '🥣', 'queijo': '🧀', 'manteiga': '🧈', 'ovo': '🥚', 'requeijão': '🧀',
    'pão': '🍞', 'pao': '🍞', 'bolo': '🍰', 'torrada': '🍞', 'macarrão': '🍝', 'macarrao': '🍝',
    'banana': '🍌', 'maçã': '🍎', 'maca': '🍎', 'tomate': '🍅', 'cebola': '🧅', 'alho': '🧄',
    'batata': '🥔', 'cenoura': '🥕', 'alface': '🥬', 'limão': '🍋', 'limao': '🍋',
    'mamão': '🥭', 'mamao': '🥭', 'abacate': '🥑', 'tangerina': '🍊', 'laranja': '🍊',
    'cebolinha': '🌿', 'cheiro verde': '🌿', 'couve': '🥬', 'sprite': '🥤',
    'arroz': '🍚', 'feijão': '🫘', 'feijao': '🫘', 'açúcar': '🍬', 'acucar': '🍬', 'sal': '🧂',
    'óleo': '🛢️', 'oleo': '🛢️', 'café': '☕', 'cafe': '☕', 'farinha': '🌾',
    'água': '💧', 'agua': '💧', 'refrigerante': '🥤', 'suco': '🧃', 'cerveja': '🍺',
    'detergente': '🧴', 'sabão': '🧺', 'sabao': '🧺', 'amaciante': '🧴', 'esponja': '🧽',
    'papel toalha': '🧻', 'papel higiênico': '🧻', 'papel higienico': '🧻',
    'shampoo': '🧴', 'sabonete': '🧼', 'creme dental': '🦷', 'desodorante': '🧴',
    'ração': '🐾', 'racao': '🐾', 'areia': '🪨'
  }
  for (const [k, icon] of Object.entries(map)) {
    if (n.includes(k)) return icon
  }
  return '🛒'
}

function parseBrazilDate(s) {
  // "DD/MM" ou "DD/MM/YYYY"
  const parts = s.split('/')
  if (parts.length === 2) {
    const [d, m] = parts
    return `2026-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (parts.length === 3) {
    const [d, m, y] = parts
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function dayIdToDate(id) {
  // id = "02012026" => "2026-01-02"
  if (id.length !== 8) return null
  return `${id.slice(4, 8)}-${id.slice(2, 4)}-${id.slice(0, 2)}`
}

// ================== MIGRATION ==================

async function main() {
  // --- 1. Categorias ---
  console.log('\n▶ 1/8 Categorias (mapeando das 11 do JSONBin)...')
  const catsNeeded = [...new Set(D.quick.map(q => q.cat))]
  const categoryMap = new Map()

  for (const catName of catsNeeded) {
    const { data: existing } = await sb.from('categories').select('id').eq('name', catName).maybeSingle()
    if (existing) {
      categoryMap.set(catName, existing.id)
      console.log(`   ✓ ${catName} (existente)`)
    } else {
      const { data: newCat, error } = await sb.from('categories').insert({
        name: catName,
        icon: categoryIcons[catName] || '📦',
        order: Object.keys(categoryIcons).indexOf(catName) + 1
      }).select().single()
      if (error) {
        console.error(`   ✗ ${catName}:`, error.message)
      } else {
        categoryMap.set(catName, newCat.id)
        console.log(`   ✓ ${catName} (criada)`)
      }
    }
  }

  // --- 2. Produtos ---
  console.log(`\n▶ 2/8 Produtos (${D.quick.length})...`)
  const productMap = new Map()
  let productsCreated = 0, productsExisting = 0

  for (const q of D.quick) {
    const { data: existing } = await sb.from('products').select('id').eq('name', q.n).maybeSingle()
    if (existing) {
      productMap.set(q.id, existing.id)
      productsExisting++
    } else {
      const { data: newP, error } = await sb.from('products').insert({
        name: q.n,
        icon: guessProductIcon(q.n),
        category_id: categoryMap.get(q.cat) ?? null,
        unit: 'un'
      }).select().single()
      if (error) {
        console.error(`   ✗ ${q.n}:`, error.message)
      } else {
        productMap.set(q.id, newP.id)
        productsCreated++
      }
    }
  }
  console.log(`   ${productsCreated} criados, ${productsExisting} já existiam`)

  // --- 3. Shopping list (itens marcados como faltando) ---
  console.log(`\n▶ 3/8 Lista atual (faltando)...`)
  const falta = D.quick.filter(q => q.falta)
  let faltaInserted = 0
  for (const q of falta) {
    const pid = productMap.get(q.id)
    if (!pid) continue
    await sb.from('shopping_list').upsert({
      product_id: pid,
      is_missing: true,
      quantity: 1
    }, { onConflict: 'product_id' })
    faltaInserted++
  }
  console.log(`   ${faltaInserted} itens marcados como faltando`)

  // --- 4. Monthly list — popular com TODOS os produtos registrados (lista fixa) ---
  console.log(`\n▶ 4/8 Lista mensal fixa (todos os produtos do histórico)...`)
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
  let monthlyInserted = 0
  for (const q of D.quick) {
    const pid = productMap.get(q.id)
    if (!pid) continue
    const { data: existing } = await sb.from('monthly_list')
      .select('id')
      .eq('product_id', pid)
      .eq('month', currentMonth)
      .maybeSingle()
    if (!existing) {
      await sb.from('monthly_list').insert({
        product_id: pid,
        month: currentMonth,
        quantity: 1,
        suggested: false,
        accepted: true
      })
      monthlyInserted++
    }
  }
  console.log(`   ${monthlyInserted} produtos na lista mensal atual`)

  // --- 5. Stores (confirmar que as que aparecem no hist existem) ---
  console.log(`\n▶ 5/8 Lojas do histórico...`)
  const storeMap = new Map()
  const storesNeeded = [...new Set([
    ...D.hist.map(h => h.local),
    ...D.notas.map(n => n.loja)
  ])]
  for (const storeName of storesNeeded) {
    const { data: existing } = await sb.from('stores')
      .select('id').ilike('name', `%${storeName.split(' ')[0]}%`).limit(1).maybeSingle()
    if (existing) {
      storeMap.set(storeName, existing.id)
      console.log(`   ✓ ${storeName} → match`)
    } else {
      const { data: newS } = await sb.from('stores').insert({
        name: storeName,
        color: '#64748b',
        order: 99
      }).select().single()
      if (newS) {
        storeMap.set(storeName, newS.id)
        console.log(`   ✓ ${storeName} → criada`)
      }
    }
  }

  // --- 6. Receipts (histórico de compras — hist + notas) ---
  console.log(`\n▶ 6/8 Receipts (compras históricas)...`)
  let receiptsCreated = 0
  for (const h of D.hist) {
    const storeId = storeMap.get(h.local) ?? null
    const purchased = parseBrazilDate(h.dt)
    const { error } = await sb.from('receipts').insert({
      photo_url: 'https://placehold.co/400x600/png?text=Historico',
      store_id: storeId,
      total: h.val,
      purchased_at: purchased ? `${purchased}T12:00:00Z` : new Date().toISOString(),
      status: 'done',
      ocr_json: { legacy: true, forma: h.forma, n_items: h.n, source: 'hist' }
    })
    if (error) console.error(`   ✗ hist ${h.id}:`, error.message)
    else receiptsCreated++
  }

  // --- 7. Notas fiscais (com foto base64) ---
  console.log(`\n▶ 7/8 Notas fiscais arquivadas (${D.notas.length})...`)
  for (const n of D.notas) {
    const storeId = storeMap.get(n.loja) ?? null
    const purchased = parseBrazilDate(n.dt)
    let photoUrl = 'https://placehold.co/400x600/png?text=Sem+Foto'

    if (n.foto && n.foto.startsWith('data:image')) {
      try {
        const match = n.foto.match(/^data:(.+?);base64,(.+)$/)
        if (match) {
          const [, mime, b64] = match
          const ext = mime.split('/')[1] || 'jpg'
          const buffer = Buffer.from(b64, 'base64')
          const path = `archive/${purchased}/${randomUUID()}.${ext}`
          const { error: upErr } = await sb.storage.from('receipts').upload(path, buffer, { contentType: mime })
          if (!upErr) {
            const { data: urlData } = sb.storage.from('receipts').getPublicUrl(path)
            photoUrl = urlData.publicUrl
            console.log(`   ✓ foto upload: ${path}`)
          } else {
            console.error(`   ⚠ falha upload foto: ${upErr.message}`)
          }
        }
      } catch (e) {
        console.error(`   ⚠ erro processando foto:`, e.message)
      }
    }

    const { data: receipt, error } = await sb.from('receipts').insert({
      photo_url: photoUrl,
      store_id: storeId,
      total: n.val,
      purchased_at: purchased ? `${purchased}T12:00:00Z` : new Date().toISOString(),
      status: 'done',
      ocr_raw: n.obs,
      ocr_json: { legacy: true, forma: n.forma, n_items: n.itens, obs: n.obs, source: 'notas' }
    }).select().single()
    if (error) console.error(`   ✗ nota ${n.id}:`, error.message)
    else {
      receiptsCreated++
      // Derivar finance entry
      await sb.from('finance_entries').insert({
        type: 'expense',
        amount: n.val,
        category: 'supermercado',
        source: 'receipt',
        receipt_id: receipt.id,
        date: purchased,
        note: `${n.loja} — ${n.forma}`
      })
    }
  }
  console.log(`   ${receiptsCreated} receipts migradas`)

  // --- Também: criar finance_entries retroativas para hist ---
  console.log(`\n▶ 7b/8 Finance entries para hist...`)
  const { data: histReceipts } = await sb.from('receipts')
    .select('id, total, purchased_at, ocr_json')
    .eq('status', 'done')
  let financeInserted = 0
  for (const r of (histReceipts ?? [])) {
    if (!r.ocr_json?.legacy || r.ocr_json?.source !== 'hist') continue
    const { data: exists } = await sb.from('finance_entries')
      .select('id').eq('receipt_id', r.id).maybeSingle()
    if (exists) continue
    const { error } = await sb.from('finance_entries').insert({
      type: 'expense',
      amount: r.total,
      category: 'supermercado',
      source: 'receipt',
      receipt_id: r.id,
      date: r.purchased_at.slice(0, 10),
      note: `Histórico — ${r.ocr_json.forma}`
    })
    if (!error) financeInserted++
  }
  console.log(`   ${financeInserted} finance entries`)

  // --- 8. Pets (Cookie e Sushi) ---
  console.log(`\n▶ 8a/8 Pets...`)
  for (const [name, data] of Object.entries(D.pets)) {
    const display = name.charAt(0).toUpperCase() + name.slice(1)
    const { data: existing } = await sb.from('pets').select('id').ilike('name', display).maybeSingle()
    if (existing) continue
    const avatar = name === 'cookie' ? '🐶' : name === 'sushi' ? '🐱' : '🐾'
    await sb.from('pets').insert({
      name: display,
      species: name === 'sushi' ? 'Gato' : 'Cachorro',
      notes: data.obs || '',
      avatar
    })
  }
  console.log(`   ✓ Cookie, Sushi`)

  // --- 8b. Zazá (izDays + izTasks) ---
  console.log(`\n▶ 8b/8 Zazá — dias trabalhados (${D.izDays.length}) + tarefas...`)

  // Delete old Izete events (from Plan 1 seed if any), keep user's history clean
  // Actually just insert; if user already added Zazá entries manually they'll coexist
  let zazaInserted = 0
  for (const d of D.izDays) {
    const date = dayIdToDate(d.id)
    if (!date) continue
    const paidAmount = d.dpago ? 150 : 0
    const transpAmount = d.tpago ? 10 : 0
    const { data: existing } = await sb.from('izete_events')
      .select('id').eq('event_date', date).maybeSingle()
    if (existing) continue
    const { error } = await sb.from('izete_events').insert({
      event_date: date,
      description: d.veio ? 'Zazá veio trabalhar' : 'Agendada',
      paid_amount: paidAmount + transpAmount,
      paid: d.liq || (d.dpago && d.tpago)
    })
    if (!error) zazaInserted++
  }
  console.log(`   ${zazaInserted} dias da Zazá migrados`)

  // --- Settings: Zazá name + PIX ---
  console.log(`\n▶ Settings — Zazá PIX e nome...`)
  await sb.from('settings').upsert({
    id: 'household',
    ticket_value: 3000,
    diaria_value: 150,
    transp_value: 10,
    whatsapp_phone: null,
    data: {
      diarista_name: 'Zazá',
      diarista_pix: '92991453944',
      diarista_day: 'ter',
      diarista_tasks: D.izTasks.ter || []
    }
  }, { onConflict: 'id' })
  console.log(`   ✓ Zazá / PIX 92991453944 / 11 tarefas`)

  console.log('\n✅ Migração completa.')
}

main().catch(err => {
  console.error('ERRO:', err)
  process.exit(1)
})
