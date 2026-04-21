#!/usr/bin/env node
// Correções pós-migração solicitadas pelo usuário:
// 1. Zazá só começou em abril/2026 — apagar izete_events < 2026-04-01
// 2. Ticket alimentação R$ 3.000 entra no último dia do mês — inserir retroativamente
// 3. Processar as 2 notas legado: extrair itens do campo obs, criar produtos faltantes,
//    adicionar à lista mensal fixa

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function lastDayOfMonth(year, month1based) {
  return new Date(Date.UTC(year, month1based, 0)).toISOString().slice(0, 10)
}

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function guessIcon(name) {
  const n = normalize(name)
  const map = {
    'banana': '🍌', 'maca': '🍎', 'abacate': '🥑', 'tangerina': '🍊', 'mamao': '🥭',
    'limao': '🍋', 'laranja': '🍊', 'tomate': '🍅', 'cebola': '🧅', 'alho': '🧄',
    'batata': '🥔', 'cenoura': '🥕', 'cebolinha': '🌿', 'cheiro verde': '🌿', 'couve': '🥬',
    'leite': '🥛', 'iogurte': '🥣', 'queijo': '🧀', 'pão': '🍞', 'pao': '🍞',
    'salmao': '🐟', 'salmão': '🐟', 'sprite': '🥤', 'agua': '💧', 'água': '💧'
  }
  for (const [k, v] of Object.entries(map)) if (n.includes(k)) return v
  return '🛒'
}

async function main() {
  // ==========================================
  // 1. Apagar dias Zazá antes de abril/2026
  // ==========================================
  console.log('\n▶ 1/3 Apagar dias Zazá antes de 2026-04-01...')
  const { data: toDelete, error: queryErr } = await sb
    .from('izete_events')
    .select('id, event_date')
    .lt('event_date', '2026-04-01')

  if (queryErr) throw queryErr
  console.log(`   Encontrados ${toDelete?.length ?? 0} dias pré-abril`)

  if (toDelete && toDelete.length > 0) {
    // Também apagar finance_entries linkadas (via izete_event_id)
    const ids = toDelete.map(d => d.id)
    const { error: fErr } = await sb.from('finance_entries').delete().in('izete_event_id', ids)
    if (fErr) console.error('   ⚠ finance cleanup:', fErr.message)

    const { error: delErr } = await sb.from('izete_events').delete().in('id', ids)
    if (delErr) throw delErr
    console.log(`   ✓ ${ids.length} dias apagados`)
  }

  // ==========================================
  // 2. Ticket alimentação R$ 3.000 retroativo (Jan/Fev/Mar 2026)
  // ==========================================
  console.log('\n▶ 2/3 Ticket alimentação R$ 3.000 retroativo...')
  const ticketMonths = [
    { year: 2026, month: 1, note: 'Vale-refeição Jan/2026' },
    { year: 2026, month: 2, note: 'Vale-refeição Fev/2026' },
    { year: 2026, month: 3, note: 'Vale-refeição Mar/2026' }
    // Abril 2026 ainda não chegou ao último dia
  ]

  for (const t of ticketMonths) {
    const date = lastDayOfMonth(t.year, t.month)
    const { data: existing } = await sb
      .from('finance_entries')
      .select('id')
      .eq('date', date)
      .eq('category', 'vale-refeicao')
      .eq('source', 'manual')
      .maybeSingle()

    if (existing) {
      console.log(`   - ${t.note}: já existe`)
      continue
    }

    const { error } = await sb.from('finance_entries').insert({
      type: 'income',
      amount: 3000,
      category: 'vale-refeicao',
      source: 'manual',
      date,
      note: t.note
    })
    if (error) console.error(`   ✗ ${t.note}:`, error.message)
    else console.log(`   ✓ ${t.note} (${date}): R$ 3.000`)
  }

  // ==========================================
  // 3. Processar itens das notas já migradas (obs field)
  // ==========================================
  console.log('\n▶ 3/3 Adicionando itens das notas legado à lista fixa...')
  const { data: legacyReceipts } = await sb
    .from('receipts')
    .select('id, total, purchased_at, ocr_json, ocr_raw, store_id')
    .eq('status', 'done')

  const currentMonth = new Date().toISOString().slice(0, 7) + '-01'

  for (const r of (legacyReceipts ?? [])) {
    const json = r.ocr_json || {}
    if (!json.legacy || json.source !== 'notas') continue

    const obsText = json.obs || r.ocr_raw || ''
    if (!obsText) continue

    const items = obsText.split(',').map(s => s.trim()).filter(Boolean)
    console.log(`   Nota ${r.id.slice(0, 8)} (${items.length} itens): ${obsText.slice(0, 80)}...`)

    for (const itemName of items) {
      // Verifica se produto existe
      const { data: existing } = await sb.from('products')
        .select('id').ilike('name', itemName).limit(1).maybeSingle()

      let productId = existing?.id

      if (!productId) {
        // Cria produto novo com ícone
        const displayName = itemName.charAt(0).toUpperCase() + itemName.slice(1).toLowerCase()
        const { data: newP, error: pErr } = await sb.from('products').insert({
          name: displayName,
          icon: guessIcon(displayName),
          unit: 'un'
        }).select().single()
        if (pErr) {
          console.error(`     ✗ criar "${displayName}":`, pErr.message)
          continue
        }
        productId = newP.id
        console.log(`     ✓ produto novo: ${displayName}`)
      }

      // Cria receipt_item (se não existe ainda)
      const { data: existingItem } = await sb.from('receipt_items')
        .select('id').eq('receipt_id', r.id).eq('product_id', productId).maybeSingle()

      if (!existingItem) {
        await sb.from('receipt_items').insert({
          receipt_id: r.id,
          product_id: productId,
          product_name_raw: itemName,
          quantity: 1,
          unit_price: null,
          total_price: null
        })
      }

      // Adiciona à lista mensal atual (se ainda não estiver)
      const { data: existingMonth } = await sb.from('monthly_list')
        .select('id')
        .eq('product_id', productId)
        .eq('month', currentMonth)
        .maybeSingle()

      if (!existingMonth) {
        await sb.from('monthly_list').insert({
          product_id: productId,
          month: currentMonth,
          quantity: 1,
          suggested: false,
          accepted: true
        })
      }
    }
  }
  console.log('   ✓ Itens das notas processados')

  console.log('\n✅ Correções aplicadas.')
}

main().catch(e => { console.error(e); process.exit(1) })
