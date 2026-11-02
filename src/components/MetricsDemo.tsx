import { useEffect, useState } from 'react'
import { SeverityLevel } from '@microsoft/applicationinsights-web'
import { appInsights } from '../telemetry/appInsights'
import { DemoCard } from './DemoCard'

/** Displays manual telemetry and elapsed page time; only stopping completes the page view. */
export function MetricsDemo() {
  const [value, setValue] = useState(42)
  const [eventRunning, setEventRunning] = useState(false)
  const [pageStartedAt, setPageStartedAt] = useState<number | null>(null)
  const [pageElapsedMs, setPageElapsedMs] = useState(0)
  const [message, setMessage] = useState('Start a timer, wait, then stop it to emit telemetry.')
  const pageRunning = pageStartedAt !== null

  useEffect(() => {
    if (pageStartedAt === null) return
    const timer = window.setInterval(() => {
      setPageElapsedMs(performance.now() - pageStartedAt)
    }, 100)
    return () => window.clearInterval(timer)
  }, [pageStartedAt])

  return (
    <DemoCard id="metrics" title="Metrics, traces & timers"
      api="trackMetric / trackTrace / startTrack*"
      description="Record a bounded numeric metric, information and warning traces, a timed business operation, or a virtual page with a visible clock."
      output="customMetrics / traces / customEvents / pageViews"
      code={`appInsights.trackMetric({ name: 'demo.cart.items', average: 42 })\nappInsights.trackTrace({\n  message: 'Demo: information trace',\n  severityLevel: SeverityLevel.Information,\n})\nappInsights.startTrackEvent('demo.timed.checkout')\n// Later:\nappInsights.stopTrackEvent('demo.timed.checkout')\nappInsights.startTrackPage('Demo virtual page')\n// Later, using the same page name:\nappInsights.stopTrackPage('Demo virtual page',\n  location.origin + '/virtual-page')`}
    >
      <label htmlFor="metric-value">Cart size: {value} items</label>
      <input id="metric-value" type="range" min="1" max="100" value={value}
        onChange={(event) => setValue(Number(event.target.value))} />
      <div className="button-row">
        <button onClick={() => {
          appInsights.trackMetric({ name: 'demo.cart.items', average: value, sampleCount: 1 }, { unit: '1' })
          setMessage(`Metric captured: ${value} items.`)
        }}>Track metric</button>
        <button className="secondary" onClick={() => {
          appInsights.trackTrace({ message: 'Demo: information trace', severityLevel: SeverityLevel.Information },
            { scenario: 'test-page' })
          setMessage('Information trace captured (severity 1).')
        }}>Track information trace</button>
        <button className="secondary" onClick={() => {
          appInsights.trackTrace({ message: 'Demo: stock is running low', severityLevel: SeverityLevel.Warning },
            { scenario: 'inventory' })
          setMessage('Warning trace captured (severity 2).')
        }}>Track warning trace</button>
      </div>
      <div className="button-row">
        <button className="secondary" onClick={() => {
          if (eventRunning) appInsights.stopTrackEvent('demo.timed.checkout', { plan: 'starter' })
          else appInsights.startTrackEvent('demo.timed.checkout')
          setEventRunning(!eventRunning)
          setMessage(eventRunning ? 'Timed event captured; duration is in milliseconds.' : 'Event timer started.')
        }}>{eventRunning ? 'Stop' : 'Start'} event timer</button>
      </div>
      <div className="page-stopwatch">
        <p>Virtual page clock</p>
        <p className="stopwatch" role="timer" aria-label="Virtual page elapsed time" aria-live="off">
          {(pageElapsedMs / 1000).toFixed(3)}<span> s</span>
        </p>
        <div className="button-row">
          <button className="secondary" onClick={() => {
            if (pageStartedAt !== null) {
              appInsights.stopTrackPage('Demo virtual page', `${location.origin}/virtual-page`)
              setPageElapsedMs(performance.now() - pageStartedAt)
              setPageStartedAt(null)
              setMessage('Timed virtual page captured; the clock is stopped.')
            } else {
              appInsights.startTrackPage('Demo virtual page')
              setPageElapsedMs(0)
              setPageStartedAt(performance.now())
              setMessage('Virtual page timer started. Stop it to emit a page view.')
            }
          }}>{pageRunning ? 'Stop' : 'Start'} page timer</button>
          <button className="secondary" disabled={pageRunning || pageElapsedMs === 0} onClick={() => {
            setPageElapsedMs(0)
            setMessage('Display clock reset. No telemetry was emitted.')
          }}>Reset clock</button>
        </div>
        <small>Seconds shown locally; the SDK records milliseconds. Stop before resetting. Each start begins a new measurement.</small>
      </div>
      <p className="feedback" role="status">{message}</p>
      <small>Virtual page timing is intentional manual telemetry, separate from automatic URL navigation.</small>
    </DemoCard>
  )
}
