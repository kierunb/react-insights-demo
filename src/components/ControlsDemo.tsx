import { useState } from 'react'
import { appInsights, setNoiseFilter } from '../telemetry/appInsights'
import { useTracking } from '../hooks/useTracking'
import { DemoCard } from './DemoCard'

export function IdentityDemo() {
  const { setUser, clearUser, trackEvent } = useTracking()
  const [signedIn, setSignedIn] = useState(false)
  const [cookies, setCookies] = useState(false)
  return (
    <DemoCard id="identity" title="User context & cookies"
      api="setAuthenticatedUserContext / getCookieMgr"
      description="Attach a fixed fictional identity to subsequent telemetry. SDK cookies are off by default and the authenticated ID is never persisted."
      output="user_AuthenticatedId"
      code={`appInsights.setAuthenticatedUserContext(\n  'demo-user', 'demo-account', false)\nappInsights.trackEvent({ name: 'demo.identity.check' })\nappInsights.clearAuthenticatedUserContext()\nappInsights.getCookieMgr().setEnabled(true)`}
    >
      <div className="button-row">
        <button onClick={() => {
          if (signedIn) clearUser()
          else setUser('demo-user', 'demo-account')
          setSignedIn(!signedIn)
        }}>{signedIn ? 'Clear demo identity' : 'Set demo identity'}</button>
        <button className="secondary" onClick={() => trackEvent('demo.identity.check')}>
          Track identity check
        </button>
      </div>
      <label className="checkbox-label">
        <input type="checkbox" checked={cookies} onChange={(event) => {
          const enabled = event.target.checked
          const manager = appInsights.getCookieMgr()
          manager.setEnabled(enabled)
          if (!enabled) {
            manager.purge('ai_user')
            manager.purge('ai_session')
            manager.purge('ai_authUser')
          }
          setCookies(enabled)
        }} />
        Allow SDK cookies for this session
      </label>
      <p className="feedback" role="status">Identity: {signedIn ? 'demo-user' : 'anonymous'}. Cookies: {cookies ? 'allowed' : 'disabled'}.</p>
      <small>Cookie control is not full telemetry consent: cookieless telemetry still flows in live mode. Never use an email address as a user ID.</small>
    </DemoCard>
  )
}

export function PipelineDemo() {
  const [filter, setFilter] = useState(false)
  const [message, setMessage] = useState('Every item is enriched with demo and service dimensions.')
  return (
    <DemoCard id="pipeline" title="Enrichment & filtering"
      api="addTelemetryInitializer / flush"
      description="An initializer adds shared dimensions before sending. Toggle the filter to drop only demo.noise, then inspect its disposition below."
      output="customDimensions / filtered inspector entries"
      code={`appInsights.addTelemetryInitializer((item) => {\n  item.data = { ...item.data, 'demo.source': 'react-playground' }\n  if (item.baseType === 'EventData' &&\n      item.baseData.name === 'demo.noise') return false\n})\nappInsights.flush() // Requests sending; not proof of ingestion.`}
    >
      <label className="checkbox-label">
        <input type="checkbox" checked={filter} onChange={(event) => {
          setNoiseFilter(event.target.checked)
          setFilter(event.target.checked)
        }} />
        Filter the noisy sample event
      </label>
      <div className="button-row">
        <button onClick={() => {
          appInsights.trackEvent({ name: 'demo.noise' })
          setMessage(filter ? 'Noisy event filtered before sending.' : 'Noisy event passed the filter.')
        }}>Emit noisy event</button>
        <button className="secondary" onClick={() => {
          void appInsights.flush()
          setMessage('Flush requested. Check Network and Azure Logs to verify delivery.')
        }}>Flush buffer</button>
      </div>
      <p className="feedback" role="status">{message}</p>
      <small>Sampling is set to 100% for demonstrations. Lower it in production to manage volume and cost.</small>
    </DemoCard>
  )
}

export function ClickDemo() {
  const [message, setMessage] = useState('Only the tagged sample is intended to produce a useful click event.')
  return (
    <DemoCard id="clicks" title="Automatic click analytics"
      api="ClickAnalyticsPlugin (optional extension)"
      description="A companion plugin captures a tagged DOM interaction without calling trackEvent. The opt-out example uses data-ai-dnt."
      output="customEvents with click content dimensions"
      code={`const clicks = new ClickAnalyticsPlugin()\n// extensions: [reactPlugin, clicks]\n// extensionConfig[clicks.identifier]:\n//   { autoCapture: true, dropInvalidEvents: true }\n<button data-id="demo-offer" data-content="starter">\n  Explore offer\n</button>\n<button data-ai-dnt="true">Do not track</button>`}
    >
      <div className="button-row">
        <button data-id="demo-offer" data-content="starter" onClick={() => {
          setMessage('Tagged click handled. The plugin captures its content automatically.')
        }}>Explore tagged offer</button>
        <button className="secondary" data-ai-dnt="true" onClick={() => {
          setMessage('Opt-out click handled. No click analytics item should be emitted.')
        }}>Do not track this click</button>
      </div>
      <p className="feedback" role="status">{message}</p>
      <small>No form values, free-text content, or personal identifiers are used in these samples.</small>
    </DemoCard>
  )
}
