# Casa & Família — Dashboard Mobile-First (Rebuild)

**Data:** 2026-04-20
**Autor:** kbarr (consolidado após brainstorm)
**Status:** aguardando revisão

---

## 1. Contexto e objetivo

O app existente em `https://app-casa-monika-karina.netlify.app` é um HTML único de 81 KB chamado "Casa & Família", usado principalmente pela esposa do usuário (Monika) para organizar a vida doméstica — lista de compras, controle de preços por supermercado, calendário da Izete (funcionária), finanças e pets. A sincronização atual usa um serviço tipo JSONBin; atualmente está falhando, e a chave da API Anthropic está exposta em texto puro no bundle público.

O objetivo do rebuild é entregar um **dashboard moderno, totalmente mobile-first e prático**, preservando todas as funcionalidades existentes e corrigindo três problemas críticos:

1. Chave da Anthropic exposta publicamente (vazamento de credencial).
2. Sincronização de dados entre os dispositivos dos dois usuários quebrada.
3. UX do fluxo principal (compras) pouco prática para uso no mercado.

**Usuários:** 2 (Monika + usuário). Sem login — acesso por URL obscura.

**Fluxo principal, conforme descrito:** ela marca ícones de produtos conforme acabam em casa → gera a lista antes de ir ao supermercado → vê onde cada item está mais barato → envia a lista pelo WhatsApp → após comprar, fotografa a nota fiscal → OCR extrai itens/preços/loja e alimenta automaticamente histórico, financeiro e preços.

---

## 2. Escopo

**Inclui:**

- Rebuild completo da SPA em Vite + React + TypeScript + Tailwind + shadcn/ui.
- PWA instalável com ícone, splash, service worker offline-first.
- Banco Supabase (free tier) com realtime para sync entre os 2 dispositivos.
- Netlify Function para OCR de nota fiscal via Claude Vision (chave server-side).
- 7 abas (manter todas): Compras, Calendário Izete, Financeiro, Pets, Notas, OS, Config.
- Fluxo "tirar foto da nota → auto-popular preços/histórico/financeiro".
- **Enriquecimento automático da lista mensal a partir do histórico de compras** (produtos recorrentes viram sugestões fixas todo mês).
- Geração e compartilhamento da lista pelo WhatsApp.
- Tela `/instalar` com instruções passo-a-passo por plataforma (iOS/Android).
- Migração dos dados existentes do bin atual (se acessível) para o Supabase.

**Fora do escopo (explícito):**

- Login/autenticação.
- App nativo (iOS/Android via App Store).
- Multi-família (só este household).
- Notificações push.
- Pagamento/integração bancária.

---

## 3. Stack técnica

| Camada | Escolha |
|---|---|
| Frontend | Vite + React 19 + TypeScript 5 |
| UI | Tailwind CSS 4 + shadcn/ui |
| Routing | TanStack Router (file-based) |
| State (cliente) | TanStack Store para state efêmero + TanStack Query para dados Supabase |
| PWA | `vite-plugin-pwa` (autoUpdate mode) |
| Ícones | `lucide-react` + emojis nativos (ícones de produto) |
| Banco | Supabase (Postgres + Realtime + Storage) |
| Serverless | Netlify Functions (TypeScript) |
| Testes | Vitest + React Testing Library + msw (+ Playwright opcional) |
| Error tracking | Sentry (free) — opcional fase 2 |
| CI/CD | Netlify (build + deploy on push to `main`) |

**Versões mínimas:** Node ≥ 20 LTS, npm ≥ 10.

---

## 4. Arquitetura

```text
┌─────────────────────────────────────────────┐
│  Cliente (React SPA, PWA instalada)         │
│  ┌───────────────────────────────────────┐  │
│  │  Bottom tabs: Início / Compras /      │  │
│  │               Notas / Finanças / Mais │  │
│  └───────────────────────────────────────┘  │
│                    ↕ Supabase JS SDK        │
│                    ↕ fetch /api/*           │
└─────────────────────────────────────────────┘
           ↓                      ↓
┌──────────────────┐   ┌──────────────────────┐
│  Supabase         │   │  Netlify Functions   │
│  - Postgres       │   │  - /api/ocr-receipt  │
│  - Realtime       │   │     → Claude Vision  │
│  - Storage        │   │  - /api/health       │
│    (receipt pics) │   │                      │
└──────────────────┘   └──────────────────────┘
                            ↓
                      ┌──────────────┐
                      │ Anthropic    │
                      │ (Sonnet 4.5) │
                      └──────────────┘
```

### Componentes principais

- **`AppShell`** — layout com header + bottom tab bar fixos; gerencia estado de tab ativa.
- **`HomeScreen`** — 2 CTAs grandes (marcar item / fotografar nota) + KPIs + lista curta de "itens faltando agora".
- **`ShoppingListPage`** — grade de produtos por categoria (ícone por produto), toque alterna "faltando".
- **`ShoppingModeScreen`** — lista agrupada por loja (cheapest-first), botão de envio pelo WhatsApp, checkboxes pra marcar "comprei".
- **`ReceiptCameraScreen`** — input de câmera → upload Supabase Storage → chama função OCR.
- **`FinancePage` / `PetsPage` / `IzetePage` / `ServiceOrdersPage`** — CRUDs simples específicos.
- **`InstallPrompt`** — componente que detecta iOS/Android e mostra instruções corretas de add-to-home-screen.
- **`useSyncStatus`** — hook que mostra "sincronizando..." / "ok" / "offline" no header.

### Limites e responsabilidades

Cada página é isolada (arquivo próprio, lê só os hooks que precisa). Lógica compartilhada em `lib/`:

- `lib/supabase.ts` — client singleton.
- `lib/ocr.ts` — chamada à função OCR + normalização do JSON retornado.
- `lib/cheapest.ts` — dado um produto, retornar a loja mais barata baseado em `product_prices`.
- `lib/whatsapp.ts` — formatar lista em texto pro wa.me.
- `lib/icons.ts` — mapeamento produto → emoji, extensível pela UI "novo produto".

---

## 5. Modelo de dados (Supabase)

Todas as tabelas são globais a 1 household (sem coluna `household_id`). RLS liberada pra anon (`using (true)` nas policies) — acesso controlado por obscuridade da URL.

### Catálogo

- **`stores`** (`id`, `name`, `color`, `order`)
- **`categories`** (`id`, `name`, `icon`, `order`)
- **`products`** (`id`, `name`, `icon`, `category_id` → categories, `unit`, `created_at`)

### Estado de compra

- **`shopping_list`** (`id`, `product_id`, `is_missing`, `quantity`, `added_at`, `added_by`)
- **`monthly_list`** (`id`, `product_id`, `month` DATE, `quantity`, `added_at`, `suggested` BOOL, `accepted` BOOL) — acumulador mensal; novos produtos entram aqui automaticamente. Itens criados pelo enriquecimento automático (§6.1b) têm `suggested=true` até ela aceitar.

### Histórico e preços

- **`product_prices`** (`id`, `product_id`, `store_id`, `price`, `date`, `source` 'receipt'|'manual')
- **`receipts`** (`id`, `photo_url`, `store_id`, `total`, `purchased_at`, `ocr_raw`, `ocr_json` JSONB, `status` 'processing'|'done'|'failed')
- **`receipt_items`** (`id`, `receipt_id` → receipts, `product_id` (nullable), `product_name_raw`, `quantity`, `unit_price`, `total_price`)

### Finanças e outros

- **`finance_entries`** (`id`, `type` 'income'|'expense', `amount`, `category`, `source` 'manual'|'receipt', `receipt_id` (nullable), `date`, `note`)
- **`pets`** (`id`, `name`, `species`, `birthdate`, `notes`, `avatar`)
- **`izete_events`** (`id`, `event_date`, `description`, `paid_amount`, `paid` BOOL)
- **`service_orders`** (`id`, `os_number`, `client_name`, `client_doc`, `items` JSONB, `total`, `status`, `created_at`)
- **`settings`** (`id` = 'household', `ticket_value`, `diaria_value`, `transp_value`, `whatsapp_phone`, `data` JSONB)

### Storage

- Bucket `receipts` — públicos para read, write via anon com policy por pasta (`receipts/YYYY-MM/`).

### Realtime

- Subscrição habilitada em `shopping_list`, `receipts`, `receipt_items`, `finance_entries` — mudanças refletem em <1s entre dispositivos.

### Migrations

- Arquivos numerados em `supabase/migrations/`:
  - `0001_schema.sql` — criação de tabelas + policies.
  - `0002_seed_catalog.sql` — lojas (DB azul, Mercantil verde, Japonês roxo), categorias base, 50–80 produtos iniciais com emoji.
  - `0003_realtime_pubs.sql` — publish tables na pub `supabase_realtime`.

---

## 6. Fluxos principais

### 6.1 Marcar item faltando

1. Home → botão `[🛒 Marcar item que acabou]` → grade de produtos agrupada por categoria.
2. Tap no ícone do produto: toggle `shopping_list.is_missing`. Borda vermelha sinaliza "faltando".
3. Botão flutuante `+ Novo produto` abre modal: nome, ícone (picker emoji + lista de sugestões), categoria. Ao confirmar:
   - Insert em `products`.
   - Insert em `shopping_list` com `is_missing=true`.
   - Insert em `monthly_list` (mês atual).

### 6.1b Enriquecimento automático da lista mensal (a partir do histórico de notas)

A cada virada de mês (ou sob demanda via botão "Sugerir itens do mês"), o app analisa as `receipts` + `receipt_items` dos últimos meses e identifica produtos recorrentes:

- **Regra de recorrência:** produto aparece em `receipt_items` em ≥ 2 dos últimos 3 meses → candidato a item fixo do mês.
- **Quantidade sugerida:** mediana das quantidades compradas por mês daquele produto.
- **Resultado:** pré-popula `monthly_list` do mês atual com esses candidatos, marcados como `suggested=true`.
- **UI (na aba Compras):** seção colapsável "📅 Sugeridos do mês (N itens)" — ela revisa e toca pra aceitar (vira item normal na mensal) ou descartar. Um clique "aceitar todas" leva tudo de uma vez.
- **Reavaliação:** quando uma nota nova entra pelo OCR, se contém um produto que ainda não está na `monthly_list` do mês atual mas tem 2 ocorrências em meses anteriores, já entra como sugerido automaticamente.

Consulta base (exemplo em SQL):

```sql
select p.id, p.name, p.icon, percentile_cont(0.5) within group (order by ri.quantity) as median_qty
from receipt_items ri
join receipts r on r.id = ri.receipt_id
join products p on p.id = ri.product_id
where r.purchased_at >= now() - interval '3 months'
  and p.id not in (select product_id from monthly_list where month = date_trunc('month', now()))
group by p.id, p.name, p.icon
having count(distinct date_trunc('month', r.purchased_at)) >= 2;
```

### 6.2 Gerar lista do mercado e enviar no WhatsApp

1. Home → `[🛍️ Ver lista do mercado]` → `ShoppingModeScreen`.
2. Para cada produto `is_missing=true`, consultar `product_prices` e escolher loja com menor preço na última semana. Agrupar itens por loja.
3. UI mostra seções expansíveis por loja, com total parcial.
4. Botão `[📤 Enviar no WhatsApp]` formata texto multilinha:

   ```text
   *Lista de compras — 20/04*

   🏪 Supermercados DB (R$ 87,50)
   • Leite — R$ 4,89
   • Arroz 5kg — R$ 22,90
   ...

   🏪 Mercantil Nova Era (R$ 124,00)
   ...

   Total estimado: R$ 249,50
   ```

   Abre `https://wa.me/?text=<encoded>`.
5. Na tela de compras, cada item tem checkbox "comprei" — ao marcar, atualiza `shopping_list.is_missing=false` otimisticamente.

### 6.3 OCR de nota fiscal (auto-populate)

1. Home → `[📸 Fotografar nota]` → `<input type="file" accept="image/*" capture="environment">`.
2. Upload pro bucket `receipts` → insere row em `receipts` com `status='processing'`.
3. Cliente chama `POST /api/ocr-receipt` com `{ receipt_id, photo_url }`.
4. Netlify Function:
   - Baixa a imagem (ou passa URL pública pro Anthropic).
   - Chama Claude Sonnet 4.5 com prompt estruturado exigindo JSON schema fixo: `{ store, date, total, items: [{name, quantity, unit_price, total_price}] }`.
   - Parse + validação (zod).
   - Match de itens contra tabela `products` por nome normalizado (lowercased + sem acentos + trim). Produto novo → cria row.
   - Match de loja em `stores` — cria se nova.
   - Insert `receipt_items` + `product_prices` (source=receipt) + `finance_entries` (expense = total).
   - Update `receipts.status='done'`, `ocr_json=<resultado>`.
5. Cliente (subscribed) recebe update → toast "Nota processada: R$ 124,70".

### 6.4 Sincronização em tempo real

- TanStack Query + Supabase Realtime: cada tela subscreve às tabelas que usa.
- Mudança de qualquer dispositivo dispara invalidação → UI atualiza em <1s.
- Estado otimista: toggle de "faltando" aplica localmente antes do round-trip, reverte se a mutation falhar.

### 6.5 Instalação PWA (entrega à Monika)

1. Mensagem pronta no WhatsApp (gerada ou copiada no próprio app): link + passo-a-passo.
2. Ela abre no Safari (iOS) ou Chrome (Android).
3. `InstallPrompt` detecta plataforma:
   - **iOS:** overlay com setinha pro botão de compartilhar + "Adicionar à Tela Inicial".
   - **Android/Chrome:** dispara `beforeinstallprompt` quando possível; fallback pra instruções visuais.
4. Depois de instalada, app abre standalone (sem barra de browser).

---

## 7. Segurança

- **Revogar agora** a chave `sk-ant-api03-Z27jh...` atualmente no HTML público.
- Nova chave vai só em `ANTHROPIC_API_KEY` no Netlify env — nunca no bundle cliente.
- `.env.local` sempre em `.gitignore`.
- Supabase anon key + URL podem ir no bundle (são públicas por design) — segurança via RLS.
- Netlify Function de OCR:
  - Rate limit simples por IP (20/hora) usando cabeçalho `x-nf-client-connection-ip`.
  - Valida `photo_url` começa com o domínio do bucket Supabase (evita function virar proxy aberto).
  - Log de custo: registra tokens/cost por chamada em `receipts.ocr_json.usage`.
- URL obscura: domínio `app-casa-monika-karina.netlify.app` não é descoberto por acaso.
- (Opcional fase 2) senha simples em modal de 1º acesso, hash em localStorage.

---

## 8. Visual / Design

- **Layout:** bottom tab bar com 5 abas: Início, Compras, Notas, Finanças, Mais. "Mais" abre bottom sheet com: Pets, Izete, OS, Config.
- **Direção de cor:** vibrante com gradientes (aprovado).
  - Gradiente primário: `from-pink-500 via-fuchsia-500 to-violet-500` (botão principal).
  - Gradiente secundário: `from-cyan-500 to-blue-500` (botão foto).
  - KPIs em cartões com gradientes (gasto em vermelho→rosa, itens em verde→teal).
  - Cores das lojas preservadas: DB `#1565c0`, Mercantil `#2e7d32`, Japonês `#6a1b9a`.
- **Tipografia:** system font stack, `-apple-system, BlinkMacSystemFont, 'Segoe UI'`.
- **Touch targets:** mínimo 44×44 px. Espaçamento vertical ≥ 8 px entre elementos clicáveis.
- **Ícones de produto:** cada produto tem emoji próprio (expansão do `ITEM_ICO` atual); lib `lib/icons.ts` mantém o mapa e permite customização via UI "novo produto".
- **Modo escuro:** fora do escopo desta entrega (ficará como pref futura).

---

## 9. Deploy e auto-deploy

- Repositório GitHub novo: `kbarrosfinal-netizen/casa-monika-karina` (público, sem segredos).
- Netlify site `app-casa-monika-karina` reconectado a este repo.
- `netlify.toml` define build + functions dir + SPA fallback.
- Env vars (painel Netlify): `ANTHROPIC_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Pipeline: push `main` → lint → typecheck → build → deploy (falha em qualquer passo aborta).
- Preview deploys automáticos em PRs.

---

## 10. Migração de dados

1. **Backup:** exportar o JSON completo do bin atual via console do app atual (sync → Export); salvar em `backups/bin-export-YYYY-MM-DD.json` (ignored do git).
2. **Script:** `scripts/migrate-from-bin.ts`:
   - Parse JSON.
   - Insert lojas → categorias → produtos → `monthly_list` histórico → `finance_entries` histórico → `pets` → `izete_events`.
   - Normaliza nomes (lowercase, sem acentos).
3. **Dry run** contra projeto Supabase de staging antes de rodar em prod.
4. **Fallback** se o bin estiver inacessível: migration `0002_seed_catalog.sql` já deixa um catálogo razoável + as 3 lojas conhecidas; OCR das próximas notas repopula rapidamente.

---

## 11. Testes

### Vitest (unit)

- `lib/cheapest.test.ts` — dado preços por loja, retorna loja com menor preço válido nos últimos 30 dias.
- `lib/whatsapp.test.ts` — formatação da mensagem (ordem, totais, quebras).
- `lib/ocr-schema.test.ts` — valida JSON da Claude Vision contra zod schema com fixtures reais.

### React Testing Library + msw

- `ShoppingListPage.test.tsx` — marcar ícone toggle is_missing + estado otimista.
- `ShoppingModeScreen.test.tsx` — agrupamento por loja + geração do texto WhatsApp.
- `ReceiptCameraScreen.test.tsx` — upload mockado → dispara /api/ocr-receipt → recebe realtime update.

### Playwright (E2E mobile, opcional)

- `shopping-happy-path.spec.ts` — viewport iPhone 12: marcar 3 itens → gerar lista → clique no botão WhatsApp leva ao `wa.me` correto.

### Pré-deploy checklist manual

- [ ] Build sem warnings.
- [ ] Chrome DevTools mobile (iPhone 12 + Galaxy S20) — touch targets OK.
- [ ] PWA instala em iOS (Safari) e Android (Chrome).
- [ ] Nota fiscal real passa pelo OCR e popula tudo correto.
- [ ] 2 abas/dispositivos sincronizam em <2s.
- [ ] `grep sk-ant dist/` vazio.
- [ ] Lighthouse mobile ≥ 90 em PWA/Perf/A11y.

---

## 12. Estrutura de arquivos proposta

```text
casa-monika-karina/
├── netlify.toml
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
│   ├── manifest.webmanifest
│   ├── icon-192.png
│   ├── icon-512.png
│   └── splash/
├── src/
│   ├── main.tsx
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx            # Home
│   │   ├── compras/
│   │   ├── notas/
│   │   ├── financas/
│   │   ├── pets/
│   │   ├── izete/
│   │   ├── os/
│   │   ├── config/
│   │   └── instalar/
│   ├── components/
│   │   ├── AppShell.tsx
│   │   ├── BottomTabs.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── shopping/
│   │   ├── receipts/
│   │   └── ui/                  # shadcn components
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── ocr.ts
│   │   ├── cheapest.ts
│   │   ├── whatsapp.ts
│   │   └── icons.ts
│   ├── hooks/
│   │   ├── useShoppingList.ts
│   │   ├── useProducts.ts
│   │   ├── useReceipts.ts
│   │   └── useSyncStatus.ts
│   └── styles/
│       └── globals.css
├── netlify/functions/
│   ├── ocr-receipt.ts
│   └── health.ts
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql
│   │   ├── 0002_seed_catalog.sql
│   │   └── 0003_realtime_pubs.sql
│   └── seed.sql
├── scripts/
│   └── migrate-from-bin.ts
├── tests/
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-20-casa-monika-karina-dashboard-design.md
```

---

## 13. Entrega (definition of done)

1. Código no repo GitHub `casa-monika-karina`, `main` verde (lint + typecheck + tests).
2. Netlify deploy ok em `app-casa-monika-karina.netlify.app`, com env vars configuradas.
3. Supabase provisionado com migrations aplicadas + seed catalog.
4. Chave Anthropic antiga revogada; nova chave só no Netlify env.
5. PWA instalável testada em iOS e Android reais.
6. Uma nota fiscal de teste real rodada pelo OCR e dados povoaram as 4 tabelas certas.
7. Sync real-time validada entre 2 dispositivos.
8. Mensagem do WhatsApp pronta para o usuário enviar à Monika.

---

## 14. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| OCR do Claude Vision errar itens/preços | Tela de "revisão" antes de confirmar — usuário valida itens parseados e corrige nomes de produto. |
| Bin atual inacessível → perda de histórico | Aceitar começar do catálogo seed; OCR de notas antigas repopula em minutos. |
| Rate limit da Anthropic estourado | Limite na function (20/h) + console alerta de custo. |
| URL descoberta por bot → abuso do OCR | Rate limit por IP + bloqueio de `photo_url` fora do bucket próprio. |
| PWA não atualiza no celular da Monika | `vite-plugin-pwa` em modo `autoUpdate` + toast "nova versão disponível". |
| Sync quebrada no meio do supermercado (sem sinal) | Cache local + indicador visual "offline, sincroniza quando voltar" — ela não perde a lista. |

---

## 15. Próximos passos

- [ ] Usuário revisa esta spec e aprova.
- [ ] Invocar `writing-plans` → plano de implementação em fases.
- [ ] Criar repo GitHub.
- [ ] Provisionar Supabase.
- [ ] Implementar por fase, fazer deploy após cada fase estável.
