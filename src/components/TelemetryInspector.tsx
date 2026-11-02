import { useState } from 'react'
import { clearTelemetryLog, useTelemetryLog } from '../telemetry/telemetryLog'

/** Displays pre-channel snapshots; queued is not a delivery acknowledgement. */
export function TelemetryInspector() {
  const entries = useTelemetryLog()
  const [type, setType] = useState('all')
  const visible = entries.filter((entry) => type === 'all' || entry.type === type)
  const types = [...new Set(entries.map((entry) => entry.type))].sort()

  return (
    <section className="inspector" id="inspector" aria-labelledby="inspector-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">See what happens</span>
          <h2 id="inspector-title">Local telemetry inspector</h2>
        </div>
        <span className="count-badge">{entries.length} / 60 items</span>
      </div>
      <p>Snapshots from the telemetry initializer, newest first. <strong>Queued does not mean delivered.</strong> Filtering, sampling, transport, or ingestion may still affect delivery.</p>
      <div className="inspector-toolbar">
        <label htmlFor="type-filter">Telemetry type</label>
        <select id="type-filter" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">All types</option>
          {types.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="secondary" onClick={() => { clearTelemetryLog(); setType('all') }}>Clear local log</button>
      </div>
      <div className="telemetry-list" data-testid="telemetry-list">
        {visible.length === 0 && <p className="empty-state">No matching telemetry yet. Try an example above.</p>}
        {visible.map((entry) => (
          <details className="telemetry-entry" key={entry.id}>
            <summary>
              <span className={`disposition ${entry.disposition}`}>{entry.disposition}</span>
              <code>{entry.type}</code>
              <strong>{entry.name}</strong>
              <time>{entry.time}</time>
            </summary>
            <pre><code>{entry.details}</code></pre>
          </details>
        ))}
      </div>
    </section>
  )
}
