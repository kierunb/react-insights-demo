import { useState } from 'react'
import { SeverityLevel } from '@microsoft/applicationinsights-web'
import { appInsights } from '../telemetry/appInsights'
import { DemoCard } from './DemoCard'

export function MetricsDemo() {
  const [value, setValue] = useState(42)
  const [eventRunning, setEventRunning] = useState(false)
  const [pageRunning, setPageRunning] = useState(false)
  const [message, setMessage] = useState('Start a timer, wait, then stop it to emit telemetry.')

  return (
    <DemoCard id="metrics" title="Metrics, traces & timers"
      api="trackMetric / trackTrace / startTrack*"
      description="Record a bounded numeric metric, a warning trace, a timed business operation, or an explicitly timed virtual page."
      output="customMetrics / traces / customEvents / pageViews"
      code={`appInsights.trackMetric({ name: 'demo.cart.items', average: 42 })\nappInsights.trackTrace({ message: 'Demo warning', severityLevel: 2 })\nappInsights.startTrackEvent('demo.timed.checkout')\n// Later:\nappInsights.stopTrackEvent('demo.timed.checkout')\n// Use startTrackPage / stopTrackPage for virtual page timing.`}
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
        <button className="secondary" onClick={() => {
          if (pageRunning) appInsights.stopTrackPage('Demo virtual page', `${location.origin}/virtual-page`)
          else appInsights.startTrackPage('Demo virtual page')
          setPageRunning(!pageRunning)
          setMessage(pageRunning ? 'Timed virtual page captured.' : 'Virtual page timer started.')
        }}>{pageRunning ? 'Stop' : 'Start'} page timer</button>
      </div>
      <p className="feedback" role="status">{message}</p>
      <small>Virtual page timing is intentional manual telemetry, separate from automatic URL navigation.</small>
    </DemoCard>
  )
}
