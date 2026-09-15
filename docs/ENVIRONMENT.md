# Arca Environment Configuration

## Purpose
This document defines required environment variables, secrecy rules, and environment setup expectations for local development and Vercel deployment.

Use the `.env.example` file as the source template.

## Configuration Rules
1. Only variables prefixed with `NEXT_PUBLIC_` may be exposed to the client.
2. `SUPABASE_SERVICE_ROLE_KEY` must remain server-side only.
3. `R2_SECRET_ACCESS_KEY` must remain server-side only.
4. R2 presign operations must use server-side credentials only.
5. Upload limits should be configurable through environment variables rather than hard-coded.

## Required Variables
### App
| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | Yes | Client/Server | Public app name |
| `NEXT_PUBLIC_APP_URL` | Yes | Client/Server | Public app URL for redirects and references |
| `NEXT_PUBLIC_MEDIA_BASE_URL` | Yes | Client/Server | Public media base URL used in UI and URL generation |

### Supabase
| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client/Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client/Server | Supabase browser-safe anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Elevated operations where required server-side |

### Cloudflare R2
| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `R2_ACCOUNT_ID` | Yes | Server only | Cloudflare account identifier |
| `R2_ACCESS_KEY_ID` | Yes | Server only | R2 API access key |
| `R2_SECRET_ACCESS_KEY` | Yes | Server only | R2 API secret key |
| `R2_BUCKET_NAME` | Yes | Server only | Bucket for uploaded files |
| `R2_ENDPOINT` | Yes | Server only | S3-compatible R2 endpoint |
| `R2_PUBLIC_BASE_URL` | Yes | Server only | Public base URL fallback for media objects |

### Upload Limits
| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB` | Yes | Client/Server | Max image upload size |
| `NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB` | Yes | Client/Server | Max video upload size |
| `NEXT_PUBLIC_MAX_DOCUMENT_UPLOAD_MB` | Yes | Client/Server | Max document upload size |

### Optional
| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | Optional | Client/Server | Runtime mode |

## Reference Values
```env
# App
NEXT_PUBLIC_APP_NAME=Arca
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MEDIA_BASE_URL=https://media.example.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=
R2_PUBLIC_BASE_URL=

# Upload Limits
NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB=25
NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB=500
NEXT_PUBLIC_MAX_DOCUMENT_UPLOAD_MB=50

# Optional
NODE_ENV=development
```

## Environment Behavior Notes
### `NEXT_PUBLIC_MEDIA_BASE_URL`
- Preferred value is the custom media domain, such as `https://media.example.com`.
- This value should match the user-facing base for public URLs.

### `R2_PUBLIC_BASE_URL`
- This is the server-side fallback when a custom media domain is not available.
- The app should consistently generate URLs from one chosen public base.

### Upload Limits
Suggested starting defaults:
- Images: `25 MB`
- Videos: `500 MB`
- Documents: `50 MB`

These should be validated:
- client-side for fast feedback
- server-side for enforcement

## Secrets Handling
### Never Expose in Browser
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL` when treated as internal config

### Safe for Browser
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_MEDIA_BASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- upload limit `NEXT_PUBLIC_` variables

## Local Development Notes
- Keep local `.env.local` out of version control.
- Use `.env.example` as the canonical template.
- Verify the local app URL and Supabase redirect settings match.
- Validate that the R2 endpoint points to the correct account and bucket.

## Vercel Deployment Notes
- Add all required variables in the Vercel project settings.
- Ensure production values differ from local values where appropriate.
- Rotate R2 and Supabase credentials if ever exposed.

## Validation Rules
At application boot or first server use, validate environment presence for:
- Supabase client config
- Supabase server config
- R2 client config
- upload ceilings

Fail fast in development if required values are missing.
