import { useState } from 'react'
import { AppInsightsErrorBoundary } from '@microsoft/applicationinsights-react-js'
import { appInsights, reactPlugin } from '../telemetry/appInsights'
import { DemoCard } from './DemoCard'

function FragileWidget({ crash }: { crash: boolean }) {
  if (crash) throw new Error('Demo: React render failure')
  return <p className="feedback">The example widget is healthy.</p>
}

function ErrorFallback() {
  return <p role="alert" className="error-message">The boundary caught the render error. The rest of the app still works.</p>
}

export function ErrorDemo() {
  const [crash, setCrash] = useState(false)
  const [version, setVersion] = useState(0)
  const [message, setMessage] = useState('Errors are deliberate and contain no user data.')

  return (
    <DemoCard id="errors" title="Exceptions & recovery"
      api="AppInsightsErrorBoundary / trackException"
      description="Compare a caught exception, a React render failure, and browser-level errors. A boundary does not catch event-handler or asynchronous errors."
      output="exceptions"
      code={`<AppInsightsErrorBoundary appInsights={reactPlugin}\n  onError={ErrorFallback}>\n  <FragileWidget />\n</AppInsightsErrorBoundary>\n\nappInsights.trackException({\n  exception: new Error('Demo: caught exception'),\n})\n// Browser errors and unhandled rejections are automatic.`}
    >
      <div className="button-row">
        <button onClick={() => {
          appInsights.trackException({ exception: new Error('Demo: caught exception') }, { scenario: 'caught' })
          setMessage('Caught exception captured explicitly.')
        }}>Track caught exception</button>
        <button className="danger" onClick={() => setCrash(true)} disabled={crash}>Break render</button>
        <button className="secondary" onClick={() => {
          setCrash(false)
          setVersion(version + 1)
          setMessage('Boundary reset. You can try the error again.')
        }}>Reset boundary</button>
      </div>
      <AppInsightsErrorBoundary key={version} appInsights={reactPlugin} onError={ErrorFallback}>
        <FragileWidget crash={crash} />
      </AppInsightsErrorBoundary>
      <details>
        <summary>Browser-level error samples</summary>
        <p>These intentionally appear in the browser console and may open Vite&apos;s development error overlay.</p>
        <div className="button-row">
          <button className="danger" onClick={() => {
            setMessage('An uncaught browser error is scheduled.')
            setTimeout(() => { throw new Error('Demo: uncaught browser error') }, 0)
          }}>Throw async error</button>
          <button className="danger" onClick={() => {
            setMessage('An unhandled rejection is scheduled.')
            void Promise.reject(new Error('Demo: unhandled promise rejection'))
          }}>Reject promise</button>
        </div>
      </details>
      <p role="status" className="feedback">{message}</p>
    </DemoCard>
  )
}
