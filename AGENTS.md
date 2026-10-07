# Repository Guidelines

## Project Structure & Module Organization

This is a Next.js 16 application using the App Router and TypeScript. Application routes, pages, and API handlers live in `src/app/`: for example, `src/app/input-data/page.tsx` is the data-entry UI and `src/app/api/scan-ktp/route.ts` is an OCR endpoint. Keep route-specific code near its route. Put reusable integration helpers and OCR prompt builders in `src/lib/` (for example, `groq.ts` and `prompts.ts`). `src/middleware.ts` handles request protection. Place static files in `public/`; do not edit generated `.next/` output.

## Build, Test, and Development Commands

- `npm ci` installs the lockfile-pinned dependencies for a clean setup.
- `npm run dev` starts the local development server at `http://localhost:3000`.
- `npm run lint` runs ESLint with the Next.js core-web-vitals and TypeScript rules.
- `npm run build` produces a production build and catches Next.js/TypeScript build errors.
- `npm run start` serves a completed production build.

There is no automated test command yet. Before submitting a change, run `npm run lint` and `npm run build`; manually exercise the affected login, form, upload, and API path. When introducing tests, keep them beside the feature as `*.test.ts` or `*.test.tsx` and add a corresponding npm script.

## Coding Style & Naming Conventions

Follow the surrounding TypeScript/TSX style: two-space indentation, semicolons, and single quotes in application code. Prefer typed values over `any`, respect the strict TypeScript configuration, and use the `@/` alias for imports from `src/`. Name React components in PascalCase, functions and variables in camelCase, and App Router endpoint folders in lowercase kebab-case (for example, `api/submit-complete/route.ts`). Keep API responses explicit and validate uploaded input before calling external services.

## Commits & Pull Requests

Recent history uses concise Conventional Commit-style subjects, such as `feat: Changing models`. Use imperative, scoped messages such as `fix: validate KTP upload type`. Keep commits focused. Pull requests should describe the behavior change, list validation commands run, link the relevant issue when available, and include screenshots for UI changes. Call out any required environment-variable or cloud-configuration change.

## Security & Configuration

Never commit `.env*`, service-account JSON, Google Drive/Spreadsheet IDs, API keys, uploaded KTP/KK images, or extracted personal data. Use local environment variables for credentials (including `GOOGLE_CREDENTIALS` and `GROQ_API_KEY`), avoid logging OCR payloads, and redact personal data from issues, screenshots, and pull-request descriptions.
