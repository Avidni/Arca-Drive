# Contributing to Arca Drive

Thanks for your interest in improving Arca Drive! This guide covers how to set up, make changes, and get them merged.

## Code of Conduct

Be respectful and constructive. Assume good faith. Harassment or abuse of any kind is not welcome.

## Ways to contribute

- **Bug reports** — open an issue with steps to reproduce, expected vs. actual behavior, and your environment (OS, Node version, browser).
- **Features / enhancements** — open an issue to discuss first so effort isn't wasted on something that won't be merged.
- **Docs** — fixes and clarifications to the README, `docs/`, or this file are always welcome.
- **Security issues** — do **not** open a public issue. See [Reporting a vulnerability](#reporting-a-vulnerability).

## Development setup

Follow the [README setup](README.md#setup) to get a Supabase project, an R2 bucket, and your `.env.local` in place. Then:

```bash
npm install
npm run dev
```

You'll need your own Supabase + R2 for local development — there is no shared/hosted dev backend. Create a test user via the Supabase dashboard (there is no public sign-up).

## Branching & pull requests

`main` is protected: changes land through pull requests, and CI must pass.

1. Fork the repo (or create a branch if you have write access).
2. Branch from `main` using a descriptive name:
   - `feat/…` new functionality
   - `fix/…` bug fixes
   - `docs/…` documentation
   - `chore/…` tooling, deps, refactors
3. Make your change in small, focused commits.
4. Open a PR against `main`. Fill in what changed and why; link any related issue.
5. Keep the PR up to date with `main` (the branch must be current for the required status check).

## Commit messages

Write clear, imperative-mood messages:

```
Fix orphaned R2 object on failed metadata write

Roll back the uploaded object when /api/files/create fails so
storage isn't leaked.
```

- First line ≤ ~72 chars, summarizing the change.
- Body explains the *why* when it isn't obvious.

## Before you push — required checks

CI runs lint, typecheck, and build. Run them locally first:

```bash
npm run lint       # ESLint (next lint)
npx tsc --noEmit   # TypeScript typecheck
npm run build      # production build
```

All three must be clean. PRs that fail CI won't be merged.

## Coding conventions

- **TypeScript**, strict mode. No `any` unless truly unavoidable.
- **Validation**: validate all API input with Zod (see `src/lib/validators/`).
- **Auth/ownership**: every API route must check `supabase.auth.getUser()` and verify row ownership; never trust a client-supplied key or id to point only at the caller's data. RLS is a backstop, not the only line of defense.
- **Secrets**: server-only env (service role, R2 keys) must never be imported into client components or prefixed `NEXT_PUBLIC_`. Never commit real credentials.
- **Styling**: Tailwind CSS v4 + the existing UI primitives in `src/components/ui`. Match the surrounding code.
- **Enforcement over UX**: client-side checks (size limits, etc.) are convenience only — enforce the real constraint server-side too.

## Database changes

- Add a new numbered migration in `supabase/migrations/` (e.g. `00005_*.sql`); never edit an existing one.
- Include the matching RLS policies for any new table.
- Note the migration in your PR description so reviewers/deployers run it.

## Reporting a vulnerability

Please report security issues privately rather than opening a public issue — use GitHub's **Report a vulnerability** (Security tab) or contact the maintainer directly. Include a description, reproduction, and impact. We'll acknowledge and work on a fix before any public disclosure.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
