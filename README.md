
# Noosphere Frontend

Noosphere is a multi-tenant practice management platform purpose-built for ABA (Applied Behavior Analysis) therapy clinics and behavioral health organizations. The frontend is composed of three independent React applications, each serving a distinct user role within the platform ecosystem.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Module Descriptions](#module-descriptions)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [Development Workflow](#development-workflow)
- [Build and Deployment](#build-and-deployment)
- [Multi-Tenant Architecture](#multi-tenant-architecture)
- [Shared Patterns and Conventions](#shared-patterns-and-conventions)
- [Security](#security)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Architecture Overview

```text
frontend/
├── tenant/     Tenant Portal — staff, clinicians, and tenant admins
├── control/    Control Panel — super admins and platform operations
├── client/     Client Portal — clients/patients and caregivers
├── LICENSE
└── README.md   This file
```

Each application is a fully standalone Vite + React 19 project with its own `package.json`, dependencies, build pipeline, Redux store, and deployment configuration. They communicate with a shared backend REST API and Socket.IO server, but are completely independent at the frontend level.

The applications are deployed to separate subpaths:

- `/tenant/` — Tenant Portal (accessed by clinic staff via `{subdomain}.nooshere.org/tenant/`)
- `/control/` — Control Panel (accessed by platform super admins via `nooshere.org/control/`)
- `/client/` — Client Portal (accessed by patients/caregivers via `{subdomain}.nooshere.org/client/`)

The root domain is `nooshere.org`; it is hard-coded in `Helper/getSubdomain.jsx` in the tenant and client modules, which treat `nooshere.org` and `www.nooshere.org` as "no tenant".

## Module Descriptions

### Tenant Portal (`/tenant/`)

The core application used by ABA clinics. Provides comprehensive practice management including client intake pipelines, appointment scheduling with calendar views, session data collection, clinical report building, billing/claims management, payroll processing, custom form creation, and role-based access control. This is the largest and most feature-rich module.

### Control Panel (`/control/`)

The platform administration dashboard used by Noosphere super admins. Manages tenant onboarding, subscription billing (Stripe + PayPal), issue tracking, feature flags per tenant, prospect pipeline for sales, system performance monitoring, and platform-wide settings.

### Client Portal (`/client/`)

The patient/caregiver-facing application. Provides clients with access to their upcoming appointments, session feedback (star ratings, signatures, SOAP notes), document management, shared forms, ABA program progress tracking, real-time chat with clinicians, and notification preferences.

## Tech Stack

| Category | Technology | Version | Purpose |
| --- | --- | --- | --- |
| **Framework** | React | 19.0 | Component-based UI framework |
| **Build Tool** | Vite | 6.x | Fast build tooling with HMR |
| **Language** | JavaScript (ES2022+) | - | No TypeScript (planned) |
| **State Management** | Redux Toolkit | 2.6 | Global state with slices |
| **State Persistence** | redux-persist | 6.0 | Persist Redux state to localStorage |
| **Routing** | React Router | 7.x | Client-side routing with lazy loading |
| **HTTP Client** | Axios | 1.8 | API calls with interceptors |
| **Real-time** | Socket.IO Client | 4.8 | WebSocket messaging and notifications |
| **Forms** | React Hook Form | 7.x | Performant form handling |
| **Validation** | Yup | 1.x | Schema-based form validation |
| **Charts** | ApexCharts | 4.5 | Interactive data visualization |
| **PDF Export** | jsPDF + html2canvas | 3.0 / 1.4 | Client-side PDF generation |
| **Rich Text** | ContentEditable + DOMPurify | 3.3 | Sanitized rich text editing |
| **Payments** | Stripe.js + PayPal SDK | 7.x / 8.x | Payment processing (control only) |
| **Drag and Drop** | @dnd-kit | 6.x | Kanban boards and sortable lists |
| **Styling** | Component-scoped CSS | - | CSS files per component |
| **Testing** | Vitest + React Testing Library | - | Unit and component testing |
| **Linting** | ESLint | 9.x | Code quality enforcement |

## Getting Started

### Prerequisites

- **Node.js** 20 (the version CI builds and tests with; no `engines` field is declared, so anything ≥18 will likely work, but 20 is what is verified)
- **npm** 9.0 or higher
- Access to the Noosphere backend API (running and accessible)

### Installation

Each module is installed independently since they are separate applications:

```bash
# Clone the repository
git clone git@github.com:ausomebee/noosphere_frontend.git
cd noosphere_frontend

# Install all three modules
cd tenant && npm install && cd ..
cd control && npm install && cd ..
cd client && npm install && cd ..
```

### Quick Start

Open three terminal windows and run each module:

```bash
# Terminal 1 — Tenant Portal
cd tenant && npm run dev

# Terminal 2 — Control Panel
cd control && npm run dev

# Terminal 3 — Client Portal
cd client && npm run dev
```

Each module sets a Vite `base`, so the dev server serves it from a subpath:

| Module | Vite `base` | URL |
| --- | --- | --- |
| Tenant | `/tenant/` | `http://localhost:5173/tenant/` |
| Control | `/control/` | `http://localhost:5174/control/` |
| Client | `/client/` | `http://localhost:5175/client/` |

No module pins a `server.port`, so Vite starts at 5173 and takes the next free port for each one after it. The ports above are what you get when you start them in the order shown; start them in a different order and the numbers move.

## Environment Configuration

Each module requires a `.env` file in its root directory. Create these files before running the dev server.

### Tenant `.env`

```env
VITE_API_URL=https://your-api-url.com/api/v1
```

### Control `.env`

```env
VITE_API_URL=https://your-api-url.com/api/v1
VITE_STRIPE_PK=pk_live_your_stripe_publishable_key
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
```

### Client `.env`

```env
VITE_API_URL=https://your-api-url.com/api/v1
```

**Important:** Never commit `.env` files to version control. The `.gitignore` is configured to exclude them. For CI/CD, inject environment variables through your deployment pipeline.

### Environment-Specific Configuration

For different environments, create additional files:

- `.env.development` — local development overrides
- `.env.staging` — staging environment
- `.env.production` — production environment

Vite automatically loads the appropriate file based on the `--mode` flag.

## Development Workflow

### Branch Strategy

Three long-lived branches, each wired to an environment by `.github/workflows/deploy-frontend.yml`:

| Branch | Environment | Deploys on |
| --- | --- | --- |
| `develop` | development | every push |
| `pre-prod` | preprod | every push |
| `master` | production | every push |

- `feature/*` — feature branches, merged into `develop`
- **There is no pull-request gate.** A push to any of the three branches builds, tests, and deploys straight to that environment, so run the tests and a build locally before pushing.

### Code Conventions

1. **DRY (Don't Repeat Yourself)** — all shared utilities, constants, and formatting functions are centralized:
   - Static data in `Data/selectOptions.js`
   - Date/time/currency formatting in `Helper/Formatters.js`
   - Toast notifications via `Helper/ShowToast.jsx`

2. **Component Organization** — each component has its own directory with `.jsx` and `.css` files

3. **API Layer** — one API file per domain (e.g., `authApis.js`, `billingApis.js`), all using the shared `AxiosInterceptor`

4. **State Management** — Redux Toolkit slices in `ReduxStore/features/`, combined in `rootReducer.js`

5. **Error Handling** — all catch blocks include user-facing feedback via `showToast()`, console statements guarded with `import.meta.env.DEV`

6. **Form Validation** — React Hook Form with Yup schemas for all user-input forms

## Build and Deployment

### Production Build

```bash
# Build each module
cd tenant && npm run build
cd control && npm run build
cd client && npm run build
```

Each module outputs to its own `dist/` directory.

### Build Optimization

All three modules use Vite with manual chunk splitting to optimize caching. Not every module declares every chunk — the "Where" column says which do:

| Chunk | Contents | Where |
| --- | --- | --- |
| `vendor-react` | React, ReactDOM, React Router | All three; changes rarely, so it caches long-term |
| `vendor-redux` | Redux Toolkit, React Redux, redux-persist | All three |
| `vendor-charts` | ApexCharts, react-apexcharts | All three; ~577KB, isolated so it loads lazily |
| `vendor-pdf` | jsPDF, html2canvas | All three; ~592KB, only fetched when exporting |
| `vendor-forms` | React Hook Form, Yup | All three |
| `vendor-ui` | React Select, React Toastify, React Icons | All three |
| `vendor-payments` | Stripe.js, PayPal SDK | Only in control |
| `vendor-dnd` | @dnd-kit | **Only in control.** Tenant depends on @dnd-kit for its Kanban board but does not split it into its own chunk; client does not use it at all |
| `vendor-geo` | country-region-data | Only in control |

The client module additionally uses Terser to strip all `console` statements and `debugger` calls in production builds.

### Deployment

Deployment is automated by `.github/workflows/deploy-frontend.yml`. A push to `develop`, `pre-prod`, or `master` runs a single job on Node 20 that:

1. Picks the target host and SSH key from the branch (`DEV_`/`PREPROD_`/`PROD_EC2_HOST_FRONTEND` secrets)
2. For each of client, control, and tenant in turn: `npm ci`, `npm test`, `npm run build`, with that environment's `VITE_*` secrets injected as build-time env
3. SSHes to the EC2 box, recreates and empties `/var/www/{client,control,tenant}`
4. SCPs each `dist/` into its directory (`strip_components: 2`)
5. Rewrites `/etc/nginx/conf.d/frontend.conf` to (re)insert a `location = /` liveness probe returning `200 OK`, runs `nginx -t`, and reloads nginx

Because step 3 empties the target directories before the uploads, a run that fails partway through step 4 leaves that environment serving nothing until the next successful deploy. A run that fails *before* step 3 — an SSH timeout, say — changes nothing on the box.

The resulting layout on the server is:

```text
/var/www/tenant/   <- tenant/dist/
/var/www/control/  <- control/dist/
/var/www/client/   <- client/dist/
```

nginx serves each module from its matching subpath and falls back to that module's `index.html` for client-side routes.

## Multi-Tenant Architecture

Noosphere uses **subdomain-based tenant isolation**:

- `acme.nooshere.org/tenant/` — ACME Corp's tenant portal
- `acme.nooshere.org/client/` — ACME Corp's client portal
- `nooshere.org/control/` — Super admin control panel (no subdomain; the control module has no `getSubdomain` at all)

### How It Works

1. The `Helper/getSubdomain.jsx` utility extracts the tenant identifier from `window.location.hostname`
2. The subdomain is stored in the Redux store (`tenantSlice`)
3. Every API request includes the `tenantId` derived from the subdomain
4. The backend validates that the authenticated user belongs to the requested tenant

### Local Development

For local development, subdomains are simulated:

- `localhost:5173` maps to a default development tenant
- You can configure your `/etc/hosts` file to map `acme.localhost` for testing multi-tenant behavior

## Shared Patterns and Conventions

Although the three modules are independent applications, they follow identical architectural patterns:

| Pattern | File | Purpose |
| --- | --- | --- |
| **Axios Interceptor** | `Helper/AxiosInterceptor.jsx` | Creates axios instances with automatic JWT token refresh. Implements request queuing during refresh to prevent race conditions. 30-second request timeout. |
| **Formatters** | `Helper/Formatters.js` | Centralized date, time, currency, and text formatting. Tenant module supports configurable formats via settings. |
| **Toast Notifications** | `Helper/ShowToast.jsx` | Consistent user-facing feedback for success/error states. Each module has its own visual style. |
| **Error Boundary** | `Helper/ErrorBoundary.jsx` | React class component that catches rendering errors and shows a fallback UI instead of crashing. |
| **Auth Hook** | `hooks/useAuth.js` | Redux selector hook returning the authenticated user, tokens, and tenant info. |
| **Idle Timeout** | `hooks/useIdleTimeout.js` | Automatically logs out the user after 30 minutes of inactivity. Listens for mousemove, keydown, click, scroll, and touchstart events. Cleans up timers and event listeners on unmount. |
| **Protected Routes** | `Components/ProtectedRoute.jsx` | Redirects unauthenticated users to the login page. |
| **Select Options** | `Data/selectOptions.js` | Single source of truth for all dropdown/select option arrays. |
| **Redux Store** | `ReduxStore/store.js` | Redux Toolkit with redux-persist for state persistence across page reloads. Each module writes to its own namespaced key (`control-root`, `tenant-root`, `client-root`) so the three never collide when served from the same origin. A version-controlled migration wipes persisted state when `APP_VERSION` changes; the three versions are set independently (control `0.1.0`, tenant `0.0.0`, client `1.0.0`). |

## Security

### Authentication

- JWT-based authentication with access and refresh tokens
- Tokens stored in Redux memory (NOT localStorage) to prevent XSS token theft
- Automatic token refresh with request queuing for concurrent API calls
- `persistor.purge()` called on logout to clear all persisted state

### Session Management

- 30-minute idle session timeout with automatic logout
- Socket.IO connections disconnected on logout
- Redux state fully cleared on session end

### Input Sanitization

- DOMPurify used for all `dangerouslySetInnerHTML` rendering
- Yup schema validation on all form inputs
- File upload validation (extension and size checks)

### Access Control

- Route-level protection via `ProtectedRoute` component
- Module-level guards in tenant (`ModuleGuard`) based on role permissions
- `usePermissions` hook for granular UI permission checks
- All authorization ultimately enforced server-side

### Production Hardening

- All `console.log`/`console.warn`/`console.info` statements guarded with `import.meta.env.DEV`
- Client module strips all console output via Terser in production builds
- No hardcoded API keys or secrets in source code
- Payment keys loaded from environment variables with graceful fallback

## Testing

Each module uses Vitest with React Testing Library. Test files live in `src/test/` within each module.

```bash
# Run the suite once
cd tenant  && npm test
cd client  && npm test
cd control && npx vitest run

# Watch mode
cd tenant  && npm run test:watch
cd client  && npm run test:watch
cd control && npm test

# With a coverage report
cd tenant  && npm run test:coverage
cd control && npm run test:coverage
cd client  && npx vitest run --coverage
```

The scripts are not identical across the three modules, which is worth knowing before you wire anything to them:

| Module | `npm test` | `test:watch` | `test:coverage` |
| --- | --- | --- | --- |
| tenant | `vitest run` (single run) | yes | yes |
| client | `vitest run` (single run) | yes | no — use `npx vitest run --coverage` |
| control | `vitest` (**watch mode** in a TTY) | no — `test:run` instead | yes |

Control's `npm test` starts a watcher when you run it locally. It still behaves as a single run in CI, because Vitest falls back to run mode when there is no TTY.

### Coverage

All three modules sit at or above 98% branch coverage:

| Module | Branches | Tests |
| --- | --- | --- |
| control | 98.10% | 568 |
| tenant | 98.40% | 1064 |
| client | 98.36% | 847 |

None of the modules configures a `coverage` block in `vitest.config.js`, so **only files a test imports are counted**. Importing a previously untested file grows the denominator, which means adding a test can lower the reported percentage before it raises it.

The remaining uncovered branches are unreachable by construction — `import.meta.env.DEV` false arms, guards behind a DOM-disabled button, and fallback messages on errors that always carry a message.

### Manual QA

Each module also carries a manual test plan at `<module>/QA_TEST_PLAN.md`, with an appendix mapping every source file to the cases that cover it.

## Contributing

1. Create a feature branch from `develop`: `git checkout -b feature/your-feature`
2. Make your changes following the conventions documented above
3. Run lint, tests, and a build in each module you touched — `npx eslint .`, `npx vitest run`, `npx vite build`
4. Merge into `develop`. Remember that the push itself deploys to the development environment; there is no pull-request gate to catch a mistake first
5. Promote `develop` -> `pre-prod` -> `master` once each environment looks right

### Key Rules

- Never commit `.env` files or API keys
- Always centralize new static data in `Data/selectOptions.js`
- Always use `Helper/Formatters.js` for date/time formatting — never inline `toLocaleDateString()`
- Always add `showToast()` feedback in catch blocks
- Guard any new console statements with `import.meta.env.DEV`

## License

See [LICENSE](./LICENSE) for details.

