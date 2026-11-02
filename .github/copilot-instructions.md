---
description: "Repository commands, architecture, and conventions for the React Application Insights demo."
---

# Copilot instructions

## Commands

Run commands from the repository root. [package.json](../package.json) defines the npm scripts.

| Command                            | Purpose                                         |
|------------------------------------|-------------------------------------------------|
| `npm ci`                           | Install dependencies from the npm lockfile      |
| `npm run dev`                      | Start the Vite development server with HMR      |
| `npm run build`                    | Run `tsc -b`, then build production assets      |
| `npx tsc -b`                       | Type-check both TypeScript projects             |
| `npm run lint`                     | Run Oxlint                                      |
| `npm run lint -- src\App.tsx`      | Lint a single file                              |
| `npm run preview`                  | Serve the production build locally after build  |

Automated tests and a single-test command are not configured.
Oxlint configuration lives in [.oxlintrc.json](../.oxlintrc.json); the type-aware linting described in [README.md](../README.md) is an optional extension, not the current configuration.

## Architecture

* [index.html](../index.html) loads [src/main.tsx](../src/main.tsx), which renders [App](../src/App.tsx) inside React `StrictMode` and `AppInsightsContext.Provider`. The UI is currently a local-state counter demo.
* [src/telemetry/appInsights.ts](../src/telemetry/appInsights.ts) creates and exports the shared `appInsights` client and `reactPlugin`. Importing this module loads the SDK and records the initial page view before React renders. The provider and tracking hooks share these instances.
* [src/hooks/useTracking.ts](../src/hooks/useTracking.ts) wraps custom events, page views, metrics, exceptions, and authenticated-user context. [src/hooks/usePerformanceTracking.ts](../src/hooks/usePerformanceTracking.ts) supplies component timing and an asynchronous API-call wrapper. These helpers exist but are not yet called by `App`.
* [tsconfig.json](../tsconfig.json) references separate [browser](../tsconfig.app.json) and [Vite configuration](../tsconfig.node.json) projects. Use build mode (`tsc -b`) to check both.

## Telemetry conventions

* Extend the existing singleton and hooks rather than initializing another SDK client or React plugin. Keep the provider wired to the exported `reactPlugin`.
* Configure `VITE_APPINSIGHTS_CONNECTION_STRING` through Vite's environment, such as the ignored local `.env` file. The SDK reads it through `import.meta.env`; Vite exposes `VITE_` values to browser code.
* Telemetry is currently enabled in development and production, with 100% sampling, automatic route tracking, unhandled-promise-rejection tracking, and page-visit timing. Change collection policy centrally in [appInsights.ts](../src/telemetry/appInsights.ts).
* Add reusable custom-event names to `TrackingEvents` in [useTracking.ts](../src/hooks/useTracking.ts). Its event API accepts string properties and numeric measurements as separate arguments.
* Preserve the `Component.<componentName>.RenderTime` metric naming in [usePerformanceTracking.ts](../src/hooks/usePerformanceTracking.ts). Its `trackApiCall` wrapper returns the original result and rethrows failures after recording dependency telemetry.

## Styling conventions

* Reuse the CSS custom properties in [src/index.css](../src/index.css), including their dark-mode overrides, when changing [src/App.css](../src/App.css).
* Styles use native CSS nesting and a shared `1024px` responsive breakpoint.
