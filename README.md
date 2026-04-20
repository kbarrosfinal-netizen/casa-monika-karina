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
