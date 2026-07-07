# Carelinq Frontend (Onco_special)

Lightweight React + Vite frontend for the Carelinq clinical assistant dashboards.

**Status:** Development — this README covers local setup, environment variables, build, and Netlify deployment.

**Quick start**

1. Install dependencies

```bash
npm install
```

2. Start development server

```bash
npm run dev
```

3. Build for production

```bash
npm run build
```

4. Preview the production build locally

```bash
npm run preview
```

Environment
- **Local env file:** Copy `.env.example` to `.env` and update values for your environment.
- Vite exposes variables prefixed with `VITE_` via `import.meta.env` at build time.

Required env vars (add these to your local `.env` or your CI/CD provider):

- `VITE_API_BASE_URL` — Base API endpoint (e.g. `https://api.example.com/api/v1`)
- `VITE_API_USER` — API user URL (used for some endpoints)
- `VITE_API_URL` — Alternate API base (fallback / compatibility)

We added an example at [/.env.example](.env.example).

Configuration change
- The frontend uses [src/config.js](src/config.js) which reads `VITE_` variables and provides safe fallbacks. Keep secrets out of the repo and use environment variables in CI/CD.

Linting

This repo includes an `npm run lint` script (ESLint). There is no committed `.eslintrc` in the project root; add one or run ESLint with your preferred configuration.

Netlify deployment

If you deploy to Netlify, set the following build settings in Site → Build & deploy → Continuous Deployment → Build settings:

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **(Optional) Functions directory:** `netlify/functions`

Add environment variables in Netlify's UI (Site settings → Build & deploy → Environment):

- `VITE_API_BASE_URL`
- `VITE_API_USER`
- `VITE_API_URL`

You can also add a `netlify.toml` to the repo to standardize the build:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Troubleshooting — blank page after deploy

- Symptom: Browser console shows: "Failed to load module script: Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'application/octet-stream'."
- Cause: Netlify served repository source files (like `/src/main.jsx`) instead of the built assets in `dist/` because the build command or publish directory was not configured.
- Fix: Ensure Netlify build command is `npm run build` and publish directory is `dist`, then re-deploy (Clear cache and deploy).

Other notes & suggestions

- We moved the hard-coded backend URLs into `src/config.js` to read from `import.meta.env.VITE_*`. See [src/config.js](src/config.js).
- A `.gitignore` was added to ignore `.env`, `dist/` and `node_modules/`.
- Consider adding an ESLint configuration file and cleaning up unused imports (several files import many lucide icons that are unused).

Contributing

- Create a branch, make changes, run `npm run build` locally to ensure the app builds, and open a PR.

License

This repository does not include a license file. Add one if you intend to publish.
