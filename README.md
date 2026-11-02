---
title: React Application Insights playground
description: Runnable React plugin and browser SDK examples with telemetry inspection and Azure verification queries.
---

## What you can learn

Each card has a small runnable example, a description, an expected Azure table,
and an expandable code snippet. The local inspector displays the latest 60
telemetry items captured by an initializer, including automatic telemetry.

The examples build on Microsoft Learn's
[React framework extension guide](https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript-framework-extensions?tabs=react),
[JavaScript SDK configuration](https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript-sdk-configuration),
and [Click Analytics guide](https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript-feature-extensions).
They use the real browser SDK and plugins, not fabricated telemetry.

## Run locally

Use Node.js 22.12 or later and npm.

```powershell
npm install
Copy-Item .env.example .env.local
```

In `.env.local`, set the connection string from your Application Insights
resource's Overview page:

```dotenv
VITE_APPINSIGHTS_CONNECTION_STRING=InstrumentationKey=<your-key>;IngestionEndpoint=https://<your-region>.in.applicationinsights.azure.com/
VITE_APPINSIGHTS_PREVIEW=false
```

```powershell
npm run dev
```

Open the URL Vite prints. If you already have `.env`, you can keep its existing
`VITE_APPINSIGHTS_CONNECTION_STRING`; `.env.local` takes precedence. Restart Vite
after changing environment variables.

Without a connection string, the UI shows setup instructions and disables
telemetry actions. SDK initialization errors are displayed rather than hidden.
The "SDK initialized" badge is not a connectivity or ingestion check.

### Local preview versus live mode

* With `VITE_APPINSIGHTS_PREVIEW=false`, examples submit telemetry to your resource.
* With `VITE_APPINSIGHTS_PREVIEW=true`, real SDK instrumentation still runs, but
  the initializer returns `false` for every item before the sender. Inspector
  entries are marked `preview`, not `queued`.
* Preview still needs a valid connection string to initialize the SDK. It is not
  an offline network sandbox: the SDK may request its own configuration.
* In live mode, `queued` means the item passed this initializer. It does not mean
  the transport or Azure ingestion succeeded.

## Examples and functionality

### React SDK TestPage sample coverage

The playground also covers the actions from Microsoft's
[React SDK TestPage sample](https://github.com/microsoft/applicationinsights-react-js/blob/main/sample/applicationinsights-react-sample/src/TestPage.tsx).
They extend the existing cards rather than initialize another SDK instance.

| Upstream action                   | Playground control                                       |
|-----------------------------------|----------------------------------------------------------|
| `trackEvent`                      | Events: Track checkout                                   |
| `trackTrace`                      | Metrics: Track information trace (severity 1)             |
| `trackException`                  | Errors: Track caught exception (severity 3)               |
| Throw an event-handler error      | Errors: Browser-level error samples / Throw handler error |
| Automatic XMLHttpRequest / fetch  | Dependencies: XHR success / Fetch success                 |
| `startTrackPage` / `stopTrackPage` | Metrics: Start / Stop page timer and visible clock        |
| Reset clock                       | Metrics: Reset clock after stopping                       |
| `flush`                           | Pipeline: Flush buffer                                   |

HTTP controls use the existing same-origin demo API instead of `httpbin.org`.
The clock refreshes every 100 milliseconds, displays seconds, freezes at the
stop time, and starts from zero for each new page measurement. Resetting is
disabled while running and only clears the stopped display; it does not emit
another page view or change the completed SDK measurement. The display interval
is cleared on stop or unmount.

### Automatic routing and page performance

Source: [App.tsx](./src/App.tsx) and
[appInsights.ts](./src/telemetry/appInsights.ts).

Click Home, Catalog, and Checkout, then use browser Back and Forward. Navigation
uses `history.pushState` without a full reload. `enableAutoRouteTracking` collects
page views after a short SDK delay. The initial page view is tracked once at
startup; no manual page-view call is added to route changes.

Do not also pass a `history` object to the React plugin, or page views may be
duplicated. The same automatic setting works with routers that update the browser
URL, including React Router's browser router.

The SDK collects initial navigation performance in `browserTimings`.
`autoTrackPageVisitTime` emits the previous page's `PageVisitTime` metric when the
next page view is tracked. Visit time is not page-load time. SPA page-view duration
is not a React render measurement and can be zero.

### React context and custom events

Source: [EventDemo.tsx](./src/components/EventDemo.tsx),
[main.tsx](./src/main.tsx), and [useTracking.ts](./src/hooks/useTracking.ts).

`AppInsightsContext.Provider` shares one `ReactPlugin`. `useAppInsightsContext`
retrieves that instance. Add product calls the setter returned by
`useTrackEvent`, which tracks `demo.cart.updated` after its data changes.
`skipFirstRun=true` avoids an event for the initial value.

Track checkout uses the core `trackEvent` API. String properties such as `plan`
are separate from numeric `measurements.itemCount`. In Azure, these appear as
`customDimensions` and `customMeasurements`, respectively.

### React component engagement

Source: [EngagementDemo.tsx](./src/components/EngagementDemo.tsx).

1. Mount either widget.
2. Click its interaction button and wait a few seconds. The hook widget also
   tracks pointer movement and keyboard activity.
3. Hide the widget to unmount it.
4. Inspect the `React Component Engaged Time (seconds)` metric.

`useTrackMetric` needs its returned activity callback wired to interactions.
`withAITracking` wraps a component and handles its activity events. Both subtract
idle time and emit on unmount, not on each click. An untouched widget does not
emit an engagement metric. `Component Name` distinguishes the two widgets.

The hook widget also calls the existing custom
[useComponentPerformance](./src/hooks/usePerformanceTracking.ts) helper. Its
milliseconds measure elapsed initial-render-to-effect time, not React CPU time,
browser page-load time, or engagement. Use React Profiler for actual render
profiling. Strict Mode can repeat mount effects in development.

### Exceptions and error boundaries

Source: [ErrorDemo.tsx](./src/components/ErrorDemo.tsx).

* Track caught exception sends an explicit `trackException` item with
  `SeverityLevel.Error` (`3`).
* Break render throws inside the child of `AppInsightsErrorBoundary`. The plugin
  reports the error and renders a fallback without replacing the whole app.
* Reset boundary remounts it so the scenario can be repeated.
* The expandable browser examples deliberately throw an event-handler error,
  throw an asynchronous error, or reject a promise without a handler. The
  event-handler example matches the upstream TestPage action and is not caught
  or manually tracked. The browser SDK captures these globally; promise
  rejection tracking is explicitly enabled.

React boundaries do not catch event-handler errors, timer callbacks, or unhandled
promise rejections. Expected demo failures remain visible in the browser console.
Vite may show an overlay, and React development mode may retry failed renders.
Do not use the exact development exception count as a production expectation.

### Metrics, traces, and timed operations

Source: [MetricsDemo.tsx](./src/components/MetricsDemo.tsx).

* Track metric records `demo.cart.items` with a value between 1 and 100. Its unit
  is a dimensionless count, not a duration.
* Track information trace records severity `Information` (`1`) in `traces`.
  Track warning trace records severity `Warning` (`2`).
* Start/Stop event timer uses `startTrackEvent` and `stopTrackEvent` to emit
  `demo.timed.checkout` with duration in milliseconds.
* Start/Stop page timer uses `startTrackPage` and `stopTrackPage` for a named
  virtual page and displays a local elapsed-time clock. This is intentionally
  separate from automatic URL navigation.

Starting a timer alone does not emit a completed item. Stop it to see the result.
Engagement metrics use seconds; custom render timing and dependency durations use
milliseconds. The Azure `pageViews.duration` field is also milliseconds.

### Automatic HTTP and manual dependencies

Source: [DependencyDemo.tsx](./src/components/DependencyDemo.tsx),
[usePerformanceTracking.ts](./src/hooks/usePerformanceTracking.ts), and
[vite.config.ts](./vite.config.ts).

* Fetch success and XHR success call `/api/demo/success`, which returns HTTP 200.
* Fetch HTTP 503 calls `/api/demo/failure`, which deliberately returns HTTP 503.
  The response is a real HTTP failure and the UI displays it.
* Custom operation measures a non-HTTP asynchronous operation with
  `trackDependencyData`; Fail custom operation records `success=false` and
  rethrows the failure to the UI.

Do not wrap fetch or XHR in the manual helper, or the same HTTP operation will
appear twice. The custom operation is labeled `InProc`, not a fictional HTTP 200
or 500. Its result codes are `0` for success and `1` for failure.

The SDK adds correlation headers for same-origin HTTP requests. Inspect the
`traceparent` header in Network. The local middleware is deliberately not a
server telemetry sample; it does not create backend request spans. To demonstrate
end-to-end distributed traces, connect an instrumented backend using compatible
W3C trace context. Cross-origin tracing also needs deliberate CORS and allowed
domain configuration.

### User identity and SDK cookies

Source: [ControlsDemo.tsx](./src/components/ControlsDemo.tsx).

Set demo identity uses the fixed fictional `demo-user` and `demo-account`.
Track identity check records a subsequent event with that context. Clear demo
identity removes the authenticated context. No authentication system is implied.
The third `setAuthenticatedUserContext` argument is `false`, so the authenticated
ID is not saved in a cookie.

SDK cookies are off at initialization. The checkbox toggles the SDK cookie
manager; turning it off also purges its default cookies. The SDK send buffer stays
in memory. Session storage remains available because `PageVisitTime` needs it to
remember the previous page. Cookie opt-out does not disable that session storage.

> [!IMPORTANT]
> Disabling cookies is not telemetry consent management. Cookieless telemetry
> still flows in live mode. A production app must apply its own consent policy
> before loading instrumentation or sending data.

### Enrichment, filtering, and flushing

Source: [appInsights.ts](./src/telemetry/appInsights.ts) and
[ControlsDemo.tsx](./src/components/ControlsDemo.tsx).

The initializer adds `service.name`, `service.version`,
`deployment.environment`, and `demo.source=react-playground` to each item.
The filter toggle returns `false` only for `demo.noise`. The inspector records
that item as `filtered`; it should not appear in Azure.

Flush buffer asks the channel to send its current batch. It is not proof of
delivery or ingestion. Sampling is 100% and the AJAX limit is 50 calls per page
view so small examples are easy to find. Review those settings for real traffic.

### Optional automatic click analytics

Source: [ControlsDemo.tsx](./src/components/ControlsDemo.tsx).

`ClickAnalyticsPlugin` is a separate extension, not built into `ReactPlugin`.
Explore tagged offer uses `data-id` and `data-content` to provide bounded sample
content. The click plugin emits an event without a manual `trackEvent` call.
Do not track this click uses `data-ai-dnt=true` to opt out.

`dropInvalidEvents=true` drops interactions without useful content. The demo does
not enable fallback capture of arbitrary element text or all page metadata.
Avoid putting user-entered values or personal data in content attributes.

## Verify in Azure

1. Use live mode and trigger a sample.
2. Inspect its local snapshot. Numeric measurements and custom dimensions can be
   expanded without exposing the SDK key or full envelope.
3. Request a flush. In browser Network, look for the ingestion request ending in
   `v2/track`; check its status and any partial-acceptance response.
4. Open Logs on the Application Insights resource and run a matching section of
   [queries.kusto](./queries.kusto).
5. Allow several minutes for ingestion. New custom metrics can take up to 10
   minutes to appear.

The queries use Application Insights table aliases (`customEvents`,
`customMetrics`, `pageViews`, `browserTimings`, `dependencies`, `exceptions`,
`traces`). Open Logs from the Application Insights resource. Direct workspace
queries use the corresponding `App*` tables and different column names.

### Troubleshooting

| Symptom | Check |
|---------|-------|
| Examples are disabled | Set the connection string and restart Vite. Read any displayed initialization error. |
| Inspector has entries but Azure does not | Check preview mode, filter state, ingestion response, connection string, resource, time range, and ingestion delay. |
| No network request immediately | The SDK batches telemetry. Request a flush. Ad blockers, CSP, or network policy can block ingestion. |
| No engagement metric | Interact with the widget, then hide it. Unmount triggers the metric. |
| Duplicate page views | Use automatic route tracking or plugin history, not both. |
| Repeated mount/error telemetry in development | React Strict Mode repeats some lifecycle work, and development error recovery can retry rendering. Compare a production preview. |
| Demo API returns HTML or 404 after deployment | Static hosting does not run Vite middleware. Deploy equivalent API endpoints or use local dev/preview for the HTTP examples. |
| No frontend-to-backend trace | The sample API has no server instrumentation. Add an instrumented backend and verify trace-context propagation. |

## Project map and validation

| Location | Responsibility |
|----------|----------------|
| [src/telemetry](./src/telemetry) | One SDK instance, plugins, initializer, and bounded inspector store |
| [src/components](./src/components) | Small independent examples and the local inspector |
| [src/hooks](./src/hooks) | Shared core-SDK event, identity, and custom operation helpers |
| [App.tsx](./src/App.tsx) | Page layout and History API navigation |
| [vite.config.ts](./vite.config.ts) | Local success/failure API in dev and production preview |

```powershell
npm test
npm run lint
npm run build
npm run preview
```

The built frontend is in `dist`. Environment variables are baked in at build
time. A static host must serve the SPA shell for `/catalog` and `/checkout`;
the local API middleware is not included in the static build.

## Production and privacy boundaries

* `VITE_*` values are client-visible. An Application Insights connection string
  identifies an ingestion resource; never put application credentials or service
  secrets in frontend environment variables. Do not commit resource-specific
  `.env` files.
* This app intentionally generates errors and telemetry. Use a dedicated demo
  resource, not a production dashboard.
* URLs, exception stacks, and automatic browser metadata can contain sensitive
  values in a real app. Do not put personal data in URLs; redact or drop sensitive
  fields in a production initializer before transport.
* Use opaque identifiers, not email addresses or other personal data. All user,
  product, and content values in this demo are fixed fictional samples.
* Tune sampling, volume limits, retention, access, and consent for your workload.
  The inspector is a learning aid, not a production telemetry viewer.
* Browser instrumentation cannot collect server requests, database telemetry,
  or server-side availability checks by itself. React Native and Angular APIs
  from the article are not applicable to this React browser app.
