# Casa & Família — Plan 1: Foundation & App Shell

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o esqueleto do novo app no Netlify com branding correto, navegação inferior funcionando, Supabase provisionado com schema/seed aplicados, e tela `/instalar` guiando a esposa a adicionar à tela inicial. Nenhuma feature de negócio ainda — próximo plan traz o fluxo de compras.

**Architecture:** Vite + React 19 + TypeScript SPA, TanStack Router file-based com layout de bottom tabs, Tailwind v4 + shadcn/ui, PWA com `vite-plugin-pwa` em modo autoUpdate, Supabase (Postgres + Realtime + Storage) com migrations versionadas, Netlify para deploy contínuo a partir de GitHub.

**Tech Stack:** Vite 7, React 19, TypeScript 5.7+, Tailwind 4, @tanstack/react-router 1.157+, @supabase/supabase-js 2.x, vite-plugin-pwa 0.21+, Vitest 2 + @testing-library/react 16 + msw 2, Node 20 LTS.

**Spec reference:** [docs/superpowers/specs/2026-04-20-casa-monika-karina-dashboard-design.md](../specs/2026-04-20-casa-monika-karina-dashboard-design.md), seções 1–4 e 9.

**Repositório alvo:** `kbarrosfinal-netizen/casa-monika-karina` (novo, público, GitHub).

---

## File structure criado ao final deste plan

```text
casa-monika-karina/
├── .gitignore
├── .env.example
├── netlify.toml
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── index.html
├── public/
│   ├── manifest.webmanifest
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── src/
│   ├── main.tsx
│   ├── router.tsx
│   ├── routeTree.gen.ts              # gerado pelo plugin
│   ├── styles/globals.css
│   ├── routes/
│   │   ├── __root.tsx                # layout com BottomTabs
│   │   ├── index.tsx                 # Home
│   │   ├── compras.tsx               # stub
│   │   ├── notas.tsx                 # stub
│   │   ├── financas.tsx              # stub
│   │   ├── mais.tsx                  # stub (menu Pets/Izete/OS/Config)
│   │   └── instalar.tsx
│   ├── components/
│   │   ├── AppHeader.tsx
│   │   ├── BottomTabs.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── ComingSoon.tsx
│   │   └── ui/                       # shadcn components (button, toast, sheet...)
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── platform.ts               # detect iOS/Android
│   │   └── cn.ts                     # class merger util
│   └── hooks/
│       └── useSyncStatus.ts
├── tests/
│   ├── setup.ts
│   └── components/
│       ├── BottomTabs.test.tsx
│       ├── InstallPrompt.test.tsx
│       └── HomeScreen.test.tsx
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 0001_schema.sql
    │   ├── 0002_seed_catalog.sql
    │   └── 0003_realtime_pubs.sql
    └── seed.sql
```

---

## Convenções de commit

Use Conventional Commits em português: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `style:`, `refactor:`. Todos os commits são NOVOS (sem amend).

---

## Phase A — Scaffold do projeto

### Task A.1: Inicializar repositório e package.json

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `README.md`
- Dir structure acima (vazias por enquanto)

- [ ] **Step 1: Criar diretório e git init**

```bash
cd /c/Users/kbarr/Temp/casa-monika
mv project casa-monika-karina  # se ainda estiver como 'project'
cd casa-monika-karina
git status  # já inicializado na sessão anterior com a spec
```

Expected: repositório já tem a spec commitada em `main`.

- [ ] **Step 2: Criar package.json**

```json
{
  "name": "casa-monika-karina",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "tsc -b --noEmit",
    "supabase:start": "supabase start",
    "supabase:db:push": "supabase db push",
    "supabase:db:reset": "supabase db reset"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@tanstack/react-query": "^5.59.0",
    "@tanstack/react-router": "^1.157.0",
    "@tanstack/react-router-devtools": "^1.157.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.475.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "@tanstack/router-plugin": "^1.157.0",
    "@tailwindcss/vite": "^4.0.6",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "jsdom": "^26.0.0",
    "msw": "^2.6.0",
    "postcss": "^8.5.2",
    "supabase": "^1.200.0",
    "tailwindcss": "^4.0.6",
    "typescript": "^5.7.2",
    "vite": "^7.0.0",
    "vite-plugin-pwa": "^0.21.0",
    "vite-tsconfig-paths": "^6.0.5",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 3: Criar .gitignore**

```gitignore
# dependencies
node_modules/

# build
dist/
dev-dist/
*.local

# env
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Supabase
supabase/.branches
supabase/.temp
.supabase

# Companion brainstorm cache
.superpowers/

# Test coverage
coverage/

# Migration backups (sensíveis)
backups/

# Logs
*.log
npm-debug.log*
```

- [ ] **Step 4: Criar .env.example**

```bash
# Cliente (pode ir no bundle — são públicas por design)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Netlify Function (server-side apenas — nunca use prefixo VITE_)
ANTHROPIC_API_KEY=sk-ant-...

# Opcional (fase 2)
SENTRY_DSN=
```

- [ ] **Step 5: Criar README.md mínimo**

```markdown
# Casa & Família

App doméstico mobile-first (PWA) para organização de compras, finanças, pets e rotina.

## Dev

```bash
npm install
cp .env.example .env.local
# preencher VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run supabase:start
npm run supabase:db:push
npm run dev
```

## Deploy

Auto-deploy via Netlify em push a `main`.
```

- [ ] **Step 6: Commit**

```bash
git add package.json .gitignore .env.example README.md
git commit -m "chore: scaffold package.json and project metadata"
```

---

### Task A.2: Instalar dependências e configurar TypeScript

**Files:**
- Create: `tsconfig.json`, `tsconfig.node.json`, `tsconfig.app.json`

- [ ] **Step 1: Instalar dependências**

```bash
npm install
```

Expected: install sem erros, `node_modules/` populado.

- [ ] **Step 2: Criar tsconfig.json (raiz, project references)**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: Criar tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Criar tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "tailwind.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5: Commit**

```bash
git add tsconfig*.json
git commit -m "chore: configure TypeScript with project references"
```

---

### Task A.3: Configurar Vite + Tailwind + PWA

**Files:**
- Create: `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/styles/globals.css`, `public/manifest.webmanifest`

- [ ] **Step 1: vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    TanStackRouterVite({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwind(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Casa & Família',
        short_name: 'Casa',
        description: 'Organização doméstica — compras, finanças, pets, rotina',
        theme_color: '#8b5cf6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-api', networkTimeoutSeconds: 3 }
          }
        ]
      }
    })
  ],
  server: { port: 5173 },
  build: { target: 'es2022', sourcemap: true }
})
```

- [ ] **Step 2: tailwind.config.ts (mínimo — Tailwind v4 usa mostly CSS)**

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} }
} satisfies Config
```

- [ ] **Step 3: postcss.config.js**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {}
  }
}
```

- [ ] **Step 4: index.html**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/png" href="/icon-192.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#8b5cf6" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <title>Casa &amp; Família</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: src/styles/globals.css**

```css
@import "tailwindcss";

@theme {
  --color-brand-500: #8b5cf6;
  --color-brand-600: #7c3aed;
  --color-brand-400: #a78bfa;
  --color-accent-pink: #ec4899;
  --color-accent-cyan: #06b6d4;
  --color-store-db: #1565c0;
  --color-store-mercantil: #2e7d32;
  --color-store-japones: #6a1b9a;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: var(--font-sans);
  -webkit-tap-highlight-color: transparent;
  overscroll-behavior-y: none;
}

body {
  background: #f7f7fa;
  color: #0f172a;
}

/* Bottom safe area para iPhone com notch */
.safe-bottom {
  padding-bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
}
```

- [ ] **Step 6: src/main.tsx (placeholder, vai ganhar router no A.4)**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="p-6">
      <h1 className="text-2xl font-bold">Casa &amp; Família</h1>
      <p>Scaffold ok.</p>
    </div>
  </StrictMode>
)
```

- [ ] **Step 7: Ícones placeholder (PNG 192 e 512, cor brand)**

Gerar com qualquer ferramenta ou Canvas. Placeholder inicial: cor sólida com "C" branco centralizado. Salvar em `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` (180×180).

Rápido com ImageMagick (se disponível):

```bash
magick -size 512x512 xc:"#8b5cf6" -gravity center -pointsize 280 -fill white -font Arial-Bold -annotate +0+0 "C" public/icon-512.png
magick public/icon-512.png -resize 192x192 public/icon-192.png
magick public/icon-512.png -resize 180x180 public/apple-touch-icon.png
```

Se ImageMagick não estiver disponível, baixar um ícone temporário qualquer e ajustar depois.

- [ ] **Step 8: Rodar dev server e validar**

```bash
npm run dev
```

Abra http://localhost:5173. Expected: página "Casa & Família · Scaffold ok." com Tailwind carregado (fonte system, sem estilos default do browser).

- [ ] **Step 9: Commit**

```bash
git add vite.config.ts tailwind.config.ts postcss.config.js index.html src/main.tsx src/styles public/
git commit -m "feat: configure Vite, Tailwind v4 and PWA manifest with brand tokens"
```

---

### Task A.4: TanStack Router com file-based routing

**Files:**
- Create: `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`, `src/routes/compras.tsx`, `src/routes/notas.tsx`, `src/routes/financas.tsx`, `src/routes/mais.tsx`, `src/routes/instalar.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: src/routes/__root.tsx (layout raiz)**

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AppHeader } from '@/components/AppHeader'
import { BottomTabs } from '@/components/BottomTabs'

export const Route = createRootRoute({
  component: RootLayout
})

function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <BottomTabs />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </div>
  )
}
```

- [ ] **Step 2: src/routes/index.tsx (Home stub)**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ShoppingCart, Camera } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: HomeScreen
})

export function HomeScreen() {
  return (
    <div className="p-4 space-y-3">
      <h2 className="sr-only">Início</h2>

      <button
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
        onClick={() => alert('Em breve: marcar item faltando')}
      >
        <ShoppingCart className="w-5 h-5" />
        Marcar item que acabou
      </button>

      <button
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold shadow-lg text-base"
        style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
        onClick={() => alert('Em breve: OCR de nota fiscal')}
      >
        <Camera className="w-5 h-5" />
        Fotografar nota fiscal
      </button>

      <div className="grid grid-cols-2 gap-3 pt-4">
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)' }}>
          <p className="text-2xl font-extrabold">R$ —</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Gasto do mês</p>
        </div>
        <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
          <p className="text-2xl font-extrabold">—</p>
          <p className="text-xs uppercase tracking-wider opacity-80">Faltando</p>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 border border-slate-200 mt-6">
        Dados aparecerão aqui depois que o Plan 2 for implementado.
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar 4 rotas stub com ComingSoon**

`src/components/ComingSoon.tsx`:

```tsx
import { ReactNode } from 'react'
import { Construction } from 'lucide-react'

export function ComingSoon({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <Construction className="w-12 h-12 text-brand-500" />
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-sm text-slate-500">{description}</p>}
      <p className="text-xs text-slate-400 mt-2">Em breve no Plan 2+</p>
    </div>
  )
}
```

`src/routes/compras.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/compras')({
  component: () => <ComingSoon title="Compras" description="Lista faltando, mensal e modo supermercado." />
})
```

`src/routes/notas.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/notas')({
  component: () => <ComingSoon title="Notas" description="Histórico de compras por supermercado." />
})
```

`src/routes/financas.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/financas')({
  component: () => <ComingSoon title="Finanças" description="Soma automática de tudo que foi registrado." />
})
```

`src/routes/mais.tsx`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { ComingSoon } from '@/components/ComingSoon'

export const Route = createFileRoute('/mais')({
  component: () => <ComingSoon title="Mais" description="Pets, Izete, OS e Config." />
})
```

- [ ] **Step 4: src/routes/instalar.tsx (placeholder, detalhado no Task C.3)**

```tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/instalar')({
  component: InstallPage
})

function InstallPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Como instalar</h2>
      <p className="text-sm text-slate-600">Instruções visuais virão no Task C.3.</p>
    </div>
  )
}
```

- [ ] **Step 5: src/router.tsx**

```tsx
import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'

export const router = createRouter({ routeTree, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
```

- [ ] **Step 6: Atualizar src/main.tsx**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { router } from './router'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
)
```

- [ ] **Step 7: Rodar dev para gerar routeTree.gen.ts**

```bash
npm run dev
```

Expected: o plugin cria `src/routeTree.gen.ts` automaticamente. Acessar http://localhost:5173 e tentar navegar (a navegação vai quebrar até o Task A.5 criar o BottomTabs).

- [ ] **Step 8: Commit**

```bash
git add src/routes src/router.tsx src/main.tsx src/components/ComingSoon.tsx src/routeTree.gen.ts
git commit -m "feat: add TanStack Router with stub routes for all tabs"
```

---

### Task A.5: AppHeader + BottomTabs (layout)

**Files:**
- Create: `src/components/AppHeader.tsx`, `src/components/BottomTabs.tsx`, `src/lib/cn.ts`, `src/hooks/useSyncStatus.ts`

- [ ] **Step 1: src/lib/cn.ts (util de class merging)**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 2: src/hooks/useSyncStatus.ts (simples, sem Supabase ainda)**

```ts
import { useEffect, useState } from 'react'

export type SyncStatus = 'ok' | 'offline' | 'syncing'

export function useSyncStatus(): SyncStatus {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online ? 'ok' : 'offline'
}
```

- [ ] **Step 3: src/components/AppHeader.tsx**

```tsx
import { useSyncStatus } from '@/hooks/useSyncStatus'

export function AppHeader() {
  const status = useSyncStatus()
  const statusLabel = status === 'ok' ? 'sync ok' : status === 'offline' ? 'offline' : 'sincronizando...'
  const statusColor = status === 'ok' ? 'text-emerald-600' : status === 'offline' ? 'text-amber-600' : 'text-sky-600'

  return (
    <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Casa &amp; Família</h1>
          <p className="text-xs text-slate-500">Olá 💜</p>
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>
    </header>
  )
}
```

- [ ] **Step 4: src/components/BottomTabs.tsx**

```tsx
import { Link, useRouterState } from '@tanstack/react-router'
import { Home, ShoppingCart, Camera, Wallet, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/cn'

const TABS = [
  { to: '/', label: 'Início', icon: Home },
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/notas', label: 'Notas', icon: Camera },
  { to: '/financas', label: 'Finanças', icon: Wallet },
  { to: '/mais', label: 'Mais', icon: MoreHorizontal }
] as const

export function BottomTabs() {
  const { location } = useRouterState()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 safe-bottom z-50"
      aria-label="Navegação principal"
    >
      <ul className="flex">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-semibold min-h-[56px]',
                  active ? 'text-brand-600' : 'text-slate-400'
                )}
              >
                <Icon className="w-5 h-5" aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 5: Rodar dev e validar visualmente**

```bash
npm run dev
```

Expected: header fixo no topo + bottom tabs fixos na base + home com os 2 botões grandes + conteúdo entre. Navegar pelas tabs troca a tela. A tab ativa fica roxa.

- [ ] **Step 6: Commit**

```bash
git add src/components src/hooks src/lib/cn.ts
git commit -m "feat: add AppHeader and BottomTabs with sync status indicator"
```

---

### Task A.6: Configurar Vitest + msw + setup de testes

**Files:**
- Create: `vitest.config.ts`, `tests/setup.ts`, `tests/components/BottomTabs.test.tsx`

- [ ] **Step 1: vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    css: true
  }
})
```

- [ ] **Step 2: tests/setup.ts**

```ts
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
```

- [ ] **Step 3: Escrever teste falhante para BottomTabs**

`tests/components/BottomTabs.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { BottomTabs } from '@/components/BottomTabs'

function renderAt(path: string) {
  const rootRoute = createRootRoute({ component: BottomTabs })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const comprasRoute = createRoute({ getParentRoute: () => rootRoute, path: '/compras', component: () => null })
  const notasRoute = createRoute({ getParentRoute: () => rootRoute, path: '/notas', component: () => null })
  const financasRoute = createRoute({ getParentRoute: () => rootRoute, path: '/financas', component: () => null })
  const maisRoute = createRoute({ getParentRoute: () => rootRoute, path: '/mais', component: () => null })

  const routeTree = rootRoute.addChildren([indexRoute, comprasRoute, notasRoute, financasRoute, maisRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] })
  })
  return render(<RouterProvider router={router} />)
}

describe('BottomTabs', () => {
  it('renders all 5 tabs', async () => {
    renderAt('/')
    expect(await screen.findByText('Início')).toBeInTheDocument()
    expect(screen.getByText('Compras')).toBeInTheDocument()
    expect(screen.getByText('Notas')).toBeInTheDocument()
    expect(screen.getByText('Finanças')).toBeInTheDocument()
    expect(screen.getByText('Mais')).toBeInTheDocument()
  })

  it('marks the current route as active', async () => {
    renderAt('/compras')
    const link = (await screen.findByText('Compras')).closest('a')
    expect(link).toHaveClass('text-brand-600')
  })
})
```

- [ ] **Step 4: Rodar teste (deve passar — implementação já existe do A.5)**

```bash
npm test -- --run
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts tests/
git commit -m "test: add Vitest setup and BottomTabs render/active-state tests"
```

---

## Phase B — Supabase (schema, seed, cliente)

### Task B.1: Instalar Supabase CLI e inicializar projeto local

**Files:**
- Create: `supabase/config.toml`

- [ ] **Step 1: Instalar Supabase CLI (se já não instalado)**

```bash
npx supabase --version
```

Se não estiver instalado: `npm install -D supabase` (já está no package.json).

- [ ] **Step 2: Init Supabase (gera config.toml + dirs)**

```bash
npx supabase init
```

Expected: cria `supabase/config.toml` + `.gitignore` local ao supabase.

- [ ] **Step 3: Editar supabase/config.toml — habilitar realtime e storage**

Garantir que as seções existem (procurar e editar):

```toml
[api]
enabled = true
port = 54321

[db]
port = 54322

[studio]
enabled = true
port = 54323

[storage]
enabled = true
file_size_limit = "50MiB"

[realtime]
enabled = true
```

- [ ] **Step 4: Start local Supabase**

```bash
npx supabase start
```

Expected: Docker sobe containers; output com URLs (API http://localhost:54321, Studio http://localhost:54323) + `anon key` + `service_role key`.

**Copiar o anon key + URL para `.env.local`:**

```bash
cp .env.example .env.local
# editar .env.local com os valores do `supabase start`
```

- [ ] **Step 5: Commit (sem segredos)**

```bash
git add supabase/config.toml supabase/.gitignore
git commit -m "chore: init local Supabase project"
```

---

### Task B.2: Migration 0001 — Schema (todas as tabelas)

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

- [ ] **Step 1: Criar a migration**

```bash
npx supabase migration new schema
# Renomear o arquivo gerado para 0001_schema.sql se necessário
```

- [ ] **Step 2: Conteúdo de `supabase/migrations/0001_schema.sql`**

```sql
-- Casa & Família — Schema inicial
-- Spec ref: §5 do design doc

-- Extensões
create extension if not exists "uuid-ossp";

-- Catálogo
create table stores (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  color text not null default '#64748b',
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text not null default '📦',
  "order" int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text not null default '🛒',
  category_id uuid references categories(id) on delete set null,
  unit text not null default 'un',
  created_at timestamptz not null default now()
);

-- Estado de compra
create table shopping_list (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  is_missing boolean not null default false,
  quantity numeric not null default 1,
  added_at timestamptz not null default now(),
  added_by text
);
create unique index shopping_list_product_uniq on shopping_list(product_id);

create table monthly_list (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  month date not null,
  quantity numeric not null default 1,
  added_at timestamptz not null default now(),
  suggested boolean not null default false,
  accepted boolean not null default true
);
create unique index monthly_list_product_month_uniq on monthly_list(product_id, month);

-- Histórico e preços
create table product_prices (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  price numeric not null,
  date date not null,
  source text not null check (source in ('receipt', 'manual'))
);
create index product_prices_product_store_date_idx on product_prices(product_id, store_id, date desc);

create table receipts (
  id uuid primary key default uuid_generate_v4(),
  photo_url text not null,
  store_id uuid references stores(id) on delete set null,
  total numeric,
  purchased_at timestamptz,
  ocr_raw text,
  ocr_json jsonb,
  status text not null default 'processing' check (status in ('processing', 'done', 'failed')),
  created_at timestamptz not null default now()
);

create table receipt_items (
  id uuid primary key default uuid_generate_v4(),
  receipt_id uuid not null references receipts(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name_raw text not null,
  quantity numeric not null default 1,
  unit_price numeric,
  total_price numeric
);

-- Finanças
create table finance_entries (
  id uuid primary key default uuid_generate_v4(),
  type text not null check (type in ('income', 'expense')),
  amount numeric not null,
  category text,
  source text not null check (source in ('receipt', 'izete', 'manual')),
  receipt_id uuid references receipts(id) on delete cascade,
  izete_event_id uuid,
  date date not null,
  note text,
  created_at timestamptz not null default now()
);

-- Pets
create table pets (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  species text,
  birthdate date,
  notes text,
  avatar text,
  created_at timestamptz not null default now()
);

-- Izete
create table izete_events (
  id uuid primary key default uuid_generate_v4(),
  event_date date not null,
  description text,
  paid_amount numeric,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- OS
create table service_orders (
  id uuid primary key default uuid_generate_v4(),
  os_number text,
  client_name text,
  client_doc text,
  items jsonb not null default '[]',
  total numeric,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

-- Settings (single row)
create table settings (
  id text primary key,
  ticket_value numeric not null default 3000,
  diaria_value numeric not null default 150,
  transp_value numeric not null default 10,
  whatsapp_phone text,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- FK retroativa de finance_entries.izete_event_id
alter table finance_entries
  add constraint finance_entries_izete_fk
  foreign key (izete_event_id) references izete_events(id) on delete cascade;

-- RLS + policies anônimas (sem login — acesso por URL obscura)
alter table stores enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table shopping_list enable row level security;
alter table monthly_list enable row level security;
alter table product_prices enable row level security;
alter table receipts enable row level security;
alter table receipt_items enable row level security;
alter table finance_entries enable row level security;
alter table pets enable row level security;
alter table izete_events enable row level security;
alter table service_orders enable row level security;
alter table settings enable row level security;

-- Policies: anon tem CRUD completo em tudo (sem login, controle por obscuridade da URL)
do $$
declare tbl text;
begin
  foreach tbl in array array['stores','categories','products','shopping_list','monthly_list','product_prices','receipts','receipt_items','finance_entries','pets','izete_events','service_orders','settings']
  loop
    execute format('create policy "anon_all_%I" on %I for all to anon using (true) with check (true);', tbl, tbl);
  end loop;
end $$;
```

- [ ] **Step 3: Aplicar migration local e validar**

```bash
npx supabase db reset
```

Expected: derruba DB local, recria, aplica migration, sem erros. Abrir Studio em http://localhost:54323 e conferir que as 13 tabelas existem.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_schema.sql
git commit -m "feat: add Supabase schema migration with 13 tables and anon RLS policies"
```

---

### Task B.3: Migration 0002 — Seed catalog

**Files:**
- Create: `supabase/migrations/0002_seed_catalog.sql`

- [ ] **Step 1: Conteúdo de `supabase/migrations/0002_seed_catalog.sql`**

```sql
-- Seed: lojas, categorias, produtos base

insert into stores (name, color, "order") values
  ('Supermercados DB', '#1565c0', 1),
  ('Mercantil Nova Era', '#2e7d32', 2),
  ('Mercadinho do Japonês', '#6a1b9a', 3)
on conflict (name) do nothing;

insert into categories (name, icon, "order") values
  ('Hortifrúti', '🥦', 1),
  ('Laticínios', '🥛', 2),
  ('Padaria', '🍞', 3),
  ('Açougue', '🥩', 4),
  ('Mercearia', '🍚', 5),
  ('Bebidas', '🥤', 6),
  ('Limpeza', '🧽', 7),
  ('Higiene', '🧼', 8),
  ('Pet', '🐾', 9),
  ('Outros', '📦', 10)
on conflict (name) do nothing;

-- Produtos base (nome, icone, categoria)
with c as (
  select name, id from categories
)
insert into products (name, icon, category_id, unit) values
  ('Leite', '🥛', (select id from c where name = 'Laticínios'), 'L'),
  ('Iogurte', '🥣', (select id from c where name = 'Laticínios'), 'un'),
  ('Queijo', '🧀', (select id from c where name = 'Laticínios'), 'kg'),
  ('Manteiga', '🧈', (select id from c where name = 'Laticínios'), 'un'),
  ('Ovos', '🥚', (select id from c where name = 'Laticínios'), 'dz'),

  ('Pão Francês', '🥖', (select id from c where name = 'Padaria'), 'kg'),
  ('Pão de Forma', '🍞', (select id from c where name = 'Padaria'), 'un'),
  ('Bolo', '🍰', (select id from c where name = 'Padaria'), 'un'),

  ('Banana', '🍌', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Maçã', '🍎', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Tomate', '🍅', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Cebola', '🧅', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Alho', '🧄', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Batata', '🥔', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Cenoura', '🥕', (select id from c where name = 'Hortifrúti'), 'kg'),
  ('Alface', '🥬', (select id from c where name = 'Hortifrúti'), 'un'),
  ('Limão', '🍋', (select id from c where name = 'Hortifrúti'), 'kg'),

  ('Carne Bovina', '🥩', (select id from c where name = 'Açougue'), 'kg'),
  ('Frango', '🍗', (select id from c where name = 'Açougue'), 'kg'),
  ('Peixe', '🐟', (select id from c where name = 'Açougue'), 'kg'),
  ('Bacon', '🥓', (select id from c where name = 'Açougue'), 'kg'),

  ('Arroz', '🍚', (select id from c where name = 'Mercearia'), 'kg'),
  ('Feijão', '🫘', (select id from c where name = 'Mercearia'), 'kg'),
  ('Macarrão', '🍝', (select id from c where name = 'Mercearia'), 'un'),
  ('Açúcar', '🍬', (select id from c where name = 'Mercearia'), 'kg'),
  ('Sal', '🧂', (select id from c where name = 'Mercearia'), 'kg'),
  ('Óleo', '🛢️', (select id from c where name = 'Mercearia'), 'L'),
  ('Café', '☕', (select id from c where name = 'Mercearia'), 'kg'),
  ('Farinha', '🌾', (select id from c where name = 'Mercearia'), 'kg'),

  ('Água', '💧', (select id from c where name = 'Bebidas'), 'L'),
  ('Refrigerante', '🥤', (select id from c where name = 'Bebidas'), 'L'),
  ('Suco', '🧃', (select id from c where name = 'Bebidas'), 'L'),
  ('Cerveja', '🍺', (select id from c where name = 'Bebidas'), 'un'),

  ('Detergente', '🧴', (select id from c where name = 'Limpeza'), 'un'),
  ('Sabão em Pó', '🧺', (select id from c where name = 'Limpeza'), 'un'),
  ('Amaciante', '🧴', (select id from c where name = 'Limpeza'), 'L'),
  ('Desinfetante', '🧪', (select id from c where name = 'Limpeza'), 'L'),
  ('Esponja', '🧽', (select id from c where name = 'Limpeza'), 'un'),
  ('Papel Toalha', '🧻', (select id from c where name = 'Limpeza'), 'un'),

  ('Papel Higiênico', '🧻', (select id from c where name = 'Higiene'), 'un'),
  ('Shampoo', '🧴', (select id from c where name = 'Higiene'), 'un'),
  ('Sabonete', '🧼', (select id from c where name = 'Higiene'), 'un'),
  ('Creme Dental', '🦷', (select id from c where name = 'Higiene'), 'un'),
  ('Desodorante', '🧴', (select id from c where name = 'Higiene'), 'un'),

  ('Ração Cachorro', '🐕', (select id from c where name = 'Pet'), 'kg'),
  ('Ração Gato', '🐈', (select id from c where name = 'Pet'), 'kg'),
  ('Areia Gato', '🪨', (select id from c where name = 'Pet'), 'kg')
on conflict (name) do nothing;

-- Settings row única
insert into settings (id, ticket_value, diaria_value, transp_value, whatsapp_phone)
values ('household', 3000, 150, 10, null)
on conflict (id) do nothing;
```

- [ ] **Step 2: Aplicar e validar**

```bash
npx supabase db reset
```

Expected: 3 lojas + 10 categorias + ~45 produtos + 1 row de settings em Studio.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0002_seed_catalog.sql
git commit -m "feat: seed stores, categories and ~45 base products"
```

---

### Task B.4: Migration 0003 — Realtime publications

**Files:**
- Create: `supabase/migrations/0003_realtime_pubs.sql`

- [ ] **Step 1: Conteúdo**

```sql
-- Habilitar realtime nas tabelas que a UI vai ouvir
alter publication supabase_realtime add table shopping_list;
alter publication supabase_realtime add table monthly_list;
alter publication supabase_realtime add table receipts;
alter publication supabase_realtime add table receipt_items;
alter publication supabase_realtime add table finance_entries;
alter publication supabase_realtime add table izete_events;
alter publication supabase_realtime add table pets;
```

- [ ] **Step 2: Reset e validar**

```bash
npx supabase db reset
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_realtime_pubs.sql
git commit -m "feat: enable realtime publication on user-facing tables"
```

---

### Task B.5: Cliente Supabase em src/lib/supabase.ts

**Files:**
- Create: `src/lib/supabase.ts`
- Modify: `.env.example`

- [ ] **Step 1: src/lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente em .env.local')
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  realtime: { params: { eventsPerSecond: 10 } },
  auth: { persistSession: false }
})
```

- [ ] **Step 2: Upgrade do useSyncStatus (opcional, ver task C.2)** — será feito em C.2.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "feat: add Supabase client singleton with realtime config"
```

---

## Phase C — Polimento e deploy

### Task C.1: Teste do Home screen + Shell integrado

**Files:**
- Create: `tests/components/HomeScreen.test.tsx`, `tests/components/AppHeader.test.tsx`

- [ ] **Step 1: Helper de render com router — `tests/helpers/renderRoute.tsx`**

```tsx
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ComponentType } from 'react'

export function renderRoute(Component: ComponentType, path = '/') {
  const rootRoute = createRootRoute()
  const route = createRoute({ getParentRoute: () => rootRoute, path, component: Component })
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: [path] })
  })
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: tests/components/HomeScreen.test.tsx**

```tsx
import { screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { renderRoute } from '../helpers/renderRoute'
import { HomeScreen } from '@/routes/index'

describe('HomeScreen', () => {
  it('mostra os 2 CTAs principais', async () => {
    renderRoute(HomeScreen, '/')
    expect(await screen.findByRole('button', { name: /marcar item que acabou/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fotografar nota fiscal/i })).toBeInTheDocument()
  })

  it('mostra KPIs placeholder', async () => {
    renderRoute(HomeScreen, '/')
    expect(await screen.findByText(/Gasto do mês/i)).toBeInTheDocument()
    expect(screen.getByText(/Faltando/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: tests/components/AppHeader.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AppHeader } from '@/components/AppHeader'

describe('AppHeader', () => {
  it('mostra título e status de sync', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    render(<AppHeader />)
    expect(screen.getByText(/Casa.*Família/i)).toBeInTheDocument()
    expect(screen.getByText(/sync ok/i)).toBeInTheDocument()
  })

  it('mostra offline quando navigator.onLine é false', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    render(<AppHeader />)
    expect(screen.getByText(/offline/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Rodar testes**

```bash
npm test -- --run
```

Expected: todos passam (BottomTabs + HomeScreen + AppHeader = 6 tests).

- [ ] **Step 5: Commit**

```bash
git add tests/
git commit -m "test: add HomeScreen and AppHeader component tests"
```

---

### Task C.2: Platform detection + InstallPrompt

**Files:**
- Create: `src/lib/platform.ts`, `src/components/InstallPrompt.tsx`, `tests/components/InstallPrompt.test.tsx`
- Modify: `src/routes/instalar.tsx`

- [ ] **Step 1: src/lib/platform.ts**

```ts
export type Platform = 'ios' | 'android' | 'desktop'

export function detectPlatform(ua: string = navigator.userAgent): Platform {
  const lowered = ua.toLowerCase()
  if (/iphone|ipad|ipod/.test(lowered)) return 'ios'
  if (/android/.test(lowered)) return 'android'
  return 'desktop'
}

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}
```

- [ ] **Step 2: Escrever teste falhante — `tests/components/InstallPrompt.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { InstallPrompt } from '@/components/InstallPrompt'

vi.mock('@/lib/platform', () => ({
  detectPlatform: vi.fn(),
  isStandalone: vi.fn(() => false)
}))

import { detectPlatform } from '@/lib/platform'

describe('InstallPrompt', () => {
  it('mostra instruções do iOS para Safari iPhone', () => {
    vi.mocked(detectPlatform).mockReturnValue('ios')
    render(<InstallPrompt />)
    expect(screen.getByText(/compartilhar/i)).toBeInTheDocument()
    expect(screen.getByText(/Adicionar à Tela Inicial/i)).toBeInTheDocument()
  })

  it('mostra instruções do Android para Chrome', () => {
    vi.mocked(detectPlatform).mockReturnValue('android')
    render(<InstallPrompt />)
    expect(screen.getByText(/três pontos/i)).toBeInTheDocument()
    expect(screen.getByText(/Instalar app/i)).toBeInTheDocument()
  })

  it('mostra fallback no desktop', () => {
    vi.mocked(detectPlatform).mockReturnValue('desktop')
    render(<InstallPrompt />)
    expect(screen.getByText(/abra este link no celular/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar teste — deve falhar (componente não existe)**

```bash
npm test -- --run InstallPrompt
```

Expected: FAIL — "Cannot find module InstallPrompt".

- [ ] **Step 4: Implementar src/components/InstallPrompt.tsx**

```tsx
import { detectPlatform, isStandalone } from '@/lib/platform'
import { Share, MoreVertical, Smartphone } from 'lucide-react'

export function InstallPrompt() {
  const platform = detectPlatform()

  if (isStandalone()) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
        ✅ Você já está usando como app instalado.
      </div>
    )
  }

  if (platform === 'ios') {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg">📱 Instalar no iPhone</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>Toque no botão <Share className="inline w-4 h-4" /> <b>compartilhar</b> na barra do Safari (embaixo na tela).</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>Role pra baixo e toque em <b>"Adicionar à Tela Inicial"</b>.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>Toque em <b>"Adicionar"</b> — o ícone aparece na sua tela inicial. Abra ele e pronto.</span>
          </li>
        </ol>
      </div>
    )
  }

  if (platform === 'android') {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-lg">📱 Instalar no Android</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <span>No Chrome, toque nos <MoreVertical className="inline w-4 h-4" /> <b>três pontos</b> no canto superior direito.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <span>Toque em <b>"Instalar app"</b> ou <b>"Adicionar à tela inicial"</b>.</span>
          </li>
          <li className="flex gap-3 items-start">
            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <span>Confirme — o ícone aparece na tela inicial. Abra e pronto.</span>
          </li>
        </ol>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-2">
      <div className="flex items-center gap-2 font-bold">
        <Smartphone className="w-5 h-5" />
        Abra este link no celular
      </div>
      <p>Pra instalar como app, acesse esta mesma URL pelo Safari (iPhone) ou Chrome (Android).</p>
    </div>
  )
}
```

- [ ] **Step 5: Atualizar src/routes/instalar.tsx**

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { InstallPrompt } from '@/components/InstallPrompt'

export const Route = createFileRoute('/instalar')({
  component: InstallPage
})

function InstallPage() {
  return (
    <div className="p-4 space-y-6">
      <header>
        <h2 className="text-2xl font-bold">Instalar no celular</h2>
        <p className="text-sm text-slate-500 mt-1">
          Uma vez instalado, abre como um app de verdade — sem barra do navegador.
        </p>
      </header>
      <InstallPrompt />
    </div>
  )
}
```

- [ ] **Step 6: Rodar testes e verificar passam**

```bash
npm test -- --run
```

Expected: todos os 9 tests passam.

- [ ] **Step 7: Commit**

```bash
git add src/lib/platform.ts src/components/InstallPrompt.tsx src/routes/instalar.tsx tests/components/InstallPrompt.test.tsx
git commit -m "feat: add platform detection and InstallPrompt with iOS/Android instructions"
```

---

### Task C.3: netlify.toml + criar repo GitHub + conectar deploy

**Files:**
- Create: `netlify.toml`

- [ ] **Step 1: Criar `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "20"
  NPM_VERSION = "10"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

- [ ] **Step 2: Build local pra garantir que passa**

```bash
npm run build
```

Expected: build sem erros; `dist/` gerado com `index.html`, `assets/`, `manifest.webmanifest`, `sw.js`, `workbox-*.js`.

- [ ] **Step 3: Checar que nenhuma chave da Anthropic vazou**

```bash
grep -r "sk-ant" dist/ 2>&1 || echo "OK sem chave"
```

Expected: "OK sem chave".

- [ ] **Step 4: Commit**

```bash
git add netlify.toml
git commit -m "chore: add netlify.toml with SPA redirect, headers and cache policy"
```

- [ ] **Step 5: Criar repositório no GitHub e conectar**

```bash
gh repo create kbarrosfinal-netizen/casa-monika-karina --public --source=. --push
```

Expected: repo criado, `main` empurrada.

- [ ] **Step 6: Provisionar Supabase prod e anotar keys**

Via https://supabase.com/dashboard:
1. Criar projeto `casa-monika-karina` (região São Paulo).
2. Copiar `Project URL` e `anon public key` da página Settings → API.
3. Na aba SQL Editor, rodar as 3 migrations em ordem (ou usar CLI: `npx supabase link --project-ref <ref>` e `npx supabase db push`).
4. Criar bucket `receipts` em Storage com política anon upload+read (a ser refinada no Plan 3).

- [ ] **Step 7: Conectar Netlify ao GitHub**

No painel https://app.netlify.com/:
1. Localizar o site `app-casa-monika-karina` (ou criar novo).
2. Site settings → Build & deploy → Link to Git → selecionar `kbarrosfinal-netizen/casa-monika-karina`, branch `main`.
3. Deploy settings: build command `npm run build`, publish directory `dist`.
4. Env vars: adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com os valores do Supabase prod.

- [ ] **Step 8: Disparar deploy e validar**

Push uma mudança trivial (ex: atualizar README) pra disparar build, ou usar "Trigger deploy" no painel Netlify.

Expected: build em <3min; https://app-casa-monika-karina.netlify.app carrega o novo shell.

- [ ] **Step 9: Revogar a chave Anthropic antiga**

1. Entrar em https://console.anthropic.com/settings/keys.
2. Revogar `sk-ant-api03-REDACTED-LEAKED-KEY`.
3. Gerar nova chave (ficará sem uso até Plan 3 — guardar em gerenciador de senhas).

---

### Task C.4: QA final e smoke test no celular real

- [ ] **Step 1: Acessar pelo celular**

No iPhone/Android do usuário: abrir https://app-casa-monika-karina.netlify.app.

Checar:
- Header mostra "Casa & Família" + "sync ok"
- Bottom tabs com 5 ícones (Início, Compras, Notas, Finanças, Mais)
- Home tem 2 botões grandes (gradientes rosa→roxo, ciano→azul) + 2 KPI cards
- Navegar pelas tabs troca tela; tab ativa fica roxa
- Toque nos CTAs da home mostra alert "Em breve"

- [ ] **Step 2: Testar instalação PWA no iPhone**

Safari → Share → Adicionar à Tela Inicial → confirmar → abrir o ícone → carrega sem barra do Safari (standalone).

- [ ] **Step 3: Testar instalação PWA no Android**

Chrome → menu (três pontos) → Instalar app → confirmar → abrir da tela inicial.

- [ ] **Step 4: Testar rota /instalar**

Abrir https://app-casa-monika-karina.netlify.app/instalar em cada plataforma. Expected: mostra as instruções certas pra cada uma.

- [ ] **Step 5: Validar sync status toggle offline**

Ativar modo avião no celular → header muda pra "offline" em amarelo → desativar → volta pra "sync ok".

- [ ] **Step 6: Lighthouse mobile (DevTools)**

No Chrome desktop, DevTools → Lighthouse → Mobile → gerar relatório.

Expected thresholds:
- Performance ≥ 90
- Accessibility ≥ 90
- Best Practices ≥ 90
- PWA ≥ 90

- [ ] **Step 7: Fechamento**

Criar issue no GitHub "Plan 2 — Fluxo Compras" como próximo trabalho. Enviar ao usuário a mensagem pronta pro WhatsApp (ela ainda não terá nada pra usar, mas pode instalar já).

---

## Definition of Done deste Plan 1

- [ ] Repo `kbarrosfinal-netizen/casa-monika-karina` no GitHub, `main` verde.
- [ ] Netlify conectado ao repo, auto-deploy funcionando.
- [ ] Build passa sem warnings, `grep sk-ant dist/` vazio.
- [ ] Supabase prod provisionado com schema + seed aplicados.
- [ ] Env vars configuradas no Netlify.
- [ ] Chave Anthropic antiga revogada.
- [ ] Home + 5 tabs + /instalar funcionando em iOS e Android reais.
- [ ] PWA instalável em iOS e Android.
- [ ] 9 testes Vitest verdes.
- [ ] Lighthouse mobile ≥ 90 em Performance / A11y / Best Practices / PWA.
- [ ] Issue "Plan 2 — Fluxo Compras" aberta no GitHub.

---

## Próximos plans

- **Plan 2:** Fluxo Compras (catálogo, lista faltando, mensal com sugestões, modo supermercado, WhatsApp).
- **Plan 3:** Notas fiscais OCR (Netlify Function + Claude Vision) + agregação Financeiro.
- **Plan 4:** Pets, Izete, OS, Config, migração de dados do bin atual, polish.

Cada plan segue o mesmo ciclo: spec → plan → implementação com TDD → deploy → QA real.
