# 2028 Australia PhD application workspace

Private application tracker (tasks, schools, timeline, materials, reading plan, supervisor contacts).
Built with vinext (Next.js on Vite) and deployed as a Cloudflare Worker with D1, protected by Cloudflare Access.

Setup, deployment and local development steps (Traditional Chinese): [START_HERE.zh-TW.md](START_HERE.zh-TW.md).

- `app/` — UI (`dashboard.tsx`), data model, API routes
- `app/access.ts` / `app/auth.ts` — Cloudflare Access JWT verification
- `drizzle/` — D1 migrations
- `.github/workflows/deploy.yml` — check, build, migrate and deploy on push to `main`
