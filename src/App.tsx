import { useEffect, useState } from 'react'
import { telemetryReady, telemetrySetupError, previewMode } from './telemetry/appInsights'
import { EventDemo } from './components/EventDemo'
import { EngagementDemo } from './components/EngagementDemo'
import { ErrorDemo } from './components/ErrorDemo'
import { MetricsDemo } from './components/MetricsDemo'
import { DependencyDemo } from './components/DependencyDemo'
import { ClickDemo, IdentityDemo, PipelineDemo } from './components/ControlsDemo'
import { TelemetryInspector } from './components/TelemetryInspector'
import './App.css'

const routes = [
  { path: '/', name: 'Home' },
  { path: '/catalog', name: 'Catalog' },
  { path: '/checkout', name: 'Checkout' },
]

function App() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const updatePath = () => {
      setPath(location.pathname)
      document.title = `React Insights | ${routes.find((route) => route.path === location.pathname)?.name ?? 'Demo'}`
    }
    updatePath()
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  return (
    <>
      <a className="skip-link" href="#main">Skip to examples</a>
      <header className="site-header">
        <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">ai</span> React Insights <span className="brand-tag">PLAYGROUND</span></a>
        <a href="https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript-framework-extensions?tabs=react"
          target="_blank" rel="noreferrer">Microsoft Learn <span aria-hidden="true">&rarr;</span></a>
      </header>
      <main id="main">
        <section className="intro" aria-labelledby="page-title">
          <div>
            <span className="eyebrow">Azure Monitor / Application Insights</span>
            <h1 id="page-title">Make every interaction<br /><span>observable.</span></h1>
            <p>A hands-on guide to Application Insights in React. Try a small example, see the telemetry, and take the pattern into your app.</p>
          </div>
          <aside className="setup-panel" aria-label="SDK configuration">
            <span className={`status-badge ${telemetryReady ? 'ready' : 'not-ready'}`}>
              <span aria-hidden="true" />{telemetryReady ? previewMode ? 'Local preview' : 'SDK initialized' : 'Setup required'}
            </span>
            <h2>One SDK. Two extensions.</h2>
            <p>ReactPlugin + ClickAnalyticsPlugin</p>
            <dl>
              <div><dt>Route tracking</dt><dd>Automatic</dd></div>
              <div><dt>Sampling</dt><dd>100%</dd></div>
              <div><dt>SDK cookies</dt><dd>Opt-in</dd></div>
              <div><dt>Transmission</dt><dd>{!telemetryReady ? 'Not initialized' : previewMode ? 'Blocked by initializer' : 'Live resource'}</dd></div>
            </dl>
          </aside>
        </section>

        {!telemetryReady && <div className="notice warning" role="alert">
          <strong>{telemetrySetupError ? 'SDK initialization failed.' : 'Configure your Application Insights resource to run the examples.'}</strong>
          <p>{telemetrySetupError ?? 'Set VITE_APPINSIGHTS_CONNECTION_STRING in .env.local, then restart Vite. Controls remain disabled until setup succeeds; no placeholder resource is used.'}</p>
        </div>}
        {telemetryReady && <div className="notice" role="note">
          {previewMode
            ? 'Preview mode: real SDK instrumentation is running, but the initializer drops all telemetry before transmission.'
            : 'Live mode: interactions send demo telemetry to your configured Azure resource. SDK initialization does not confirm connectivity or ingestion.'}
        </div>}

        <nav className="section-nav" aria-label="Examples">
          <a href="#routing">Routing</a><a href="#events">Events</a>
          <a href="#engagement">Engagement</a><a href="#errors">Errors</a>
          <a href="#metrics">Metrics</a><a href="#dependencies">Dependencies</a>
          <a href="#identity">Identity</a><a href="#pipeline">Pipeline</a>
          <a href="#clicks">Clicks</a><a href="#inspector">Inspector</a>
        </nav>

        <section className="routing-panel" id="routing" aria-labelledby="routing-title">
          <div>
            <span className="eyebrow">01 / Navigation</span>
            <h2 id="routing-title">Pages without a reload</h2>
            <p>These links use the browser History API. The SDK tracks URL changes automatically, including Back and Forward. Do not also configure plugin history tracking.</p>
          </div>
          <div>
            <nav className="route-links" aria-label="Demo pages">
              {routes.map((route) => (
                <a key={route.path} href={route.path} aria-current={path === route.path ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                    event.preventDefault()
                    if (location.pathname === route.path) return
                    document.title = `React Insights | ${route.name}`
                    history.pushState({}, '', route.path)
                    setPath(route.path)
                  }}>{route.name}</a>
              ))}
            </nav>
            <p className="route-current" role="status">Current route: <code>{path}</code></p>
            <small>Look for pageViews and PageVisitTime. Initial navigation also collects browser page-load performance; SPA route duration is not render time.</small>
          </div>
        </section>

        <div className="section-heading examples-heading">
          <div><span className="eyebrow">02 / Instrumentation</span><h2>Small examples. Real telemetry.</h2></div>
          <span className="count-badge">8 interactive examples</span>
        </div>
        <p className="sample-reference">Includes the actions from Microsoft&apos;s{' '}
          <a href="https://github.com/microsoft/applicationinsights-react-js/blob/main/sample/applicationinsights-react-sample/src/TestPage.tsx"
            target="_blank" rel="noreferrer">React TestPage sample</a>: events, traces, exceptions, HTTP calls, flushing, and a timed page with a clock.</p>
        <fieldset className="examples-fieldset" disabled={!telemetryReady}>
          <legend className="sr-only">Telemetry examples</legend>
          <div className="demo-grid">
            <EventDemo />
            {telemetryReady ? <EngagementDemo /> : <div className="demo-card"><h3>Component engagement</h3><p>Configure the SDK to mount the hook and higher-order component examples.</p></div>}
            <ErrorDemo />
            <MetricsDemo />
            <DependencyDemo />
            <IdentityDemo />
            <PipelineDemo />
            <ClickDemo />
          </div>
        </fieldset>
        <TelemetryInspector />
        <section className="verify-panel" aria-labelledby="verify-title">
          <h2 id="verify-title">Follow the signal into Azure</h2>
          <ol>
            <li>Try an example and expand its inspector entry.</li>
            <li>In live mode, request a flush and inspect the browser Network request to <code>v2/track</code>.</li>
            <li>Open your resource&apos;s Logs and run the matching query from <code>queries.kusto</code>. Allow several minutes for ingestion; new metrics can take up to 10 minutes.</li>
          </ol>
          <p>The project README explains each sample, configuration, privacy, correlation, production deployment, and troubleshooting.</p>
        </section>
      </main>
      <footer>Built for learning, not production traffic. <span>React + TypeScript + Azure Monitor</span></footer>
    </>
  )
}

export default App
