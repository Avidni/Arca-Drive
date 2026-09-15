# Arca Drive

A self-hosted, single-tenant personal media & document library. Upload images, videos, documents, and arbitrary files; organize them into folders and tags; keep items public or private; and gate sensitive actions behind step-up MFA.

Built with **Next.js 15** (App Router), **Supabase** (auth + Postgres + Row-Level Security), and **Cloudflare R2** (S3-compatible object storage).

> Arca Drive is the open-source edition of Arca. Files are stored in your own R2 bucket; metadata and auth live in your own Supabase project. You own all the data.

---

## Features

- 📁 **Categorized storage** — Images, Videos, Documents, and Files, each with its own view and upload limits
- 🔒 **Public / private files** — private files are served via short-lived (15 min) signed URLs
- 🗂️ **Folders & tags** — organize and filter your library
- 🔎 **Search & sort** — by name, date, size, type, favorite
- 🛡️ **Step-up security** — optionally require TOTP or email OTP before deleting, changing visibility, or viewing private files
- ⬆️ **Direct-to-R2 uploads** — presigned PUT uploads with client + server size enforcement and orphan rollback
- 🌗 **Light / dark theme**

---

## Architecture

```
Browser ──► Next.js API routes ──► Supabase (auth + Postgres, RLS enforced)
   │                     │
   │                     └────────► Cloudflare R2 (presigned URLs only; keys never public)
   │
   └── uploads/downloads go directly to R2 via presigned URLs (server never proxies file bytes)
```

- **Auth**: Supabase email/password + optional TOTP MFA. Sessions via `@supabase/ssr` cookies, validated in middleware.
- **Authorization**: Postgres Row-Level Security on every table (`auth.uid() = user_id`). API routes additionally verify ownership.
- **Storage keys**: `{category}/{userId}/{year}/{month}/{uuid}-{filename}` — object deletes are guarded by the owner segment.

See [`docs/`](docs/) for the full architecture, database schema, and UI/UX specs.

---

## Prerequisites

- **Node.js 18+** and npm
- A **Supabase** project — https://supabase.com
- A **Cloudflare R2** bucket + API token — https://developers.cloudflare.com/r2/

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/Avidni/Arca-Drive.git
cd Arca-Drive
npm install
```

### 2. Supabase

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run the migrations **in order**:
   - `supabase/migrations/00001_initial_schema.sql`
   - `supabase/migrations/00002_rls_policies.sql`
   - `supabase/migrations/00003_security_settings.sql`
   - `supabase/migrations/00004_files_category.sql`
3. From **Project Settings → API**, copy the **Project URL**, the **anon** key, and the **service_role** key.

**Creating users** — Arca Drive has **no public sign-up** by design (it's a personal drive). Create each user yourself:

- **Supabase Dashboard → Authentication → Users → Add user** (set email + password, mark email confirmed), or
- via the Admin API using your `service_role` key.

Users then log in at `/login`. (Optional) they can enrol a TOTP authenticator from **Settings** to enable MFA and step-up protection.

### 3. Cloudflare R2

1. Create a bucket (**R2 → Create bucket**).
2. Create an **R2 API token** (Account → R2 → Manage API Tokens) with Object Read & Write on the bucket. Note the Access Key ID, Secret Access Key, and your Account ID.
3. (Optional) enable public access / connect a custom domain if you want `public` files served from a public base URL.
4. Configure CORS so the browser can upload directly. Either paste the rule from the Cloudflare dashboard, or run:

   ```powershell
   ./scripts/configure-r2-cors.ps1 -AccountId <id> -BucketName <bucket> -ApiToken <token> -Origin1 http://localhost:3000 -Origin2 https://your-domain.com
   ```

   The script prints the exact JSON rule if you'd rather set it manually.

### 4. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | public | Display name (default `Arca Drive`) |
| `NEXT_PUBLIC_APP_URL` | public | e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | public | Public base URL for served media |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | Never expose to the browser |
| `R2_ACCOUNT_ID` | **server-only** | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | **server-only** | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | **server-only** | R2 API secret |
| `R2_BUCKET_NAME` | **server-only** | Bucket name |
| `R2_ENDPOINT` | **server-only** | `https://<account_id>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_BASE_URL` | **server-only** | Public URL prefix for objects |
| `NEXT_PUBLIC_MAX_*_UPLOAD_MB` | public | Per-category upload limits (also enforced server-side) |

> `.env.local` is gitignored. **Never commit real credentials.** If a key is ever exposed, rotate it immediately in Supabase / Cloudflare.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000 and log in with a user you created in step 2.

---

## Deployment (Vercel)

1. Push this repo to GitHub and import it into Vercel.
2. Add **every** variable from `.env.local` in **Vercel → Project → Settings → Environment Variables** (production values).
3. Add your production domain to the R2 CORS origins (step 3.4).
4. Deploy.

Any Node.js host works; Vercel is the path of least resistance for Next.js.

---

## Security notes

- Row-Level Security is enforced at the database — the anon key alone cannot read another user's rows.
- Upload size limits are validated **both** client-side (UX) and server-side (enforcement) — the presign endpoint rejects oversized requests.
- R2 object deletes are scoped to the caller's own key prefix.
- Private files are only reachable through short-lived signed URLs.
- The `service_role` key bypasses RLS — keep it server-side only.

Found a vulnerability? Please open a private report rather than a public issue.

---

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch/PR workflow, coding conventions, and how to report security issues. `main` is protected: changes land via pull request with CI (lint, typecheck, build) passing.

## License

[MIT](LICENSE) © Avidni
