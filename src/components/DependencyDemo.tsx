import { useState } from 'react'
import { trackApiCall } from '../hooks/usePerformanceTracking'
import { DemoCard } from './DemoCard'

function isDemoResponse(value: unknown): value is { demo: true } {
  return typeof value === 'object' && value !== null && 'demo' in value && value.demo === true
}

function requestWithXhr() {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('GET', '/api/demo/success')
    request.responseType = 'json'
    request.timeout = 5000
    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(`XHR returned HTTP ${request.status}`))
      } else if (!isDemoResponse(request.response)) {
        reject(new Error('Demo API is unavailable. Use npm run dev or npm run preview.'))
      } else {
        resolve()
      }
    }
    request.onerror = () => reject(new Error('XHR network failure'))
    request.ontimeout = () => reject(new Error('XHR timed out'))
    request.send()
  })
}

export function DependencyDemo() {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Local demo endpoints return HTTP 200 or an intentional 503.')
  const [failed, setFailed] = useState(false)

  async function run(kind: 'fetch' | 'failed-fetch' | 'xhr' | 'custom' | 'failed-custom') {
    setBusy(true)
    setFailed(false)
    try {
      if (kind === 'xhr') {
        await requestWithXhr()
      } else if (kind === 'custom' || kind === 'failed-custom') {
        await trackApiCall('demo.process.order', async () => {
          await new Promise((resolve) => setTimeout(resolve, 300))
          if (kind === 'failed-custom') throw new Error('Demo: custom operation failed')
        })
      } else {
        const path = kind === 'failed-fetch' ? 'failure' : 'success'
        const response = await fetch(`/api/demo/${path}`)
        if (!response.ok) throw new Error(`Demo API returned HTTP ${response.status}`)
        const result: unknown = await response.json()
        if (!isDemoResponse(result)) {
          throw new Error('Demo API is unavailable. Use npm run dev or npm run preview.')
        }
      }
      setMessage(`${kind}: completed. Look for one dependency, not a manually duplicated HTTP call.`)
    } catch (error) {
      setFailed(true)
      setMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DemoCard id="dependencies" title="Network & custom dependencies"
      api="Automatic fetch / XHR / trackDependencyData"
      description="Fetch and XMLHttpRequest are instrumented automatically, including failures and duration. Manually track only operations that are not already auto-collected."
      output="dependencies"
      code={`// Automatically collected; do not wrap with trackDependencyData.\nawait fetch('/api/demo/success')\n\n// A non-HTTP operation requires manual instrumentation:\nappInsights.trackDependencyData({\n  id: crypto.randomUUID().replaceAll('-', ''),\n  name: 'demo.process.order', type: 'InProc',\n  target: 'demo-worker', duration: 300,\n  success: true, responseCode: 0,\n})`}
    >
      <div className="button-row">
        <button disabled={busy} onClick={() => void run('fetch')}>Fetch success</button>
        <button className="danger" disabled={busy} onClick={() => void run('failed-fetch')}>Fetch HTTP 503</button>
        <button className="secondary" disabled={busy} onClick={() => void run('xhr')}>XHR success</button>
        <button className="secondary" disabled={busy} onClick={() => void run('custom')}>Custom operation</button>
        <button className="danger" disabled={busy} onClick={() => void run('failed-custom')}>Fail custom operation</button>
      </div>
      <p className={failed ? 'error-message' : 'feedback'} role="status">{busy ? 'Waiting for operation...' : message}</p>
      <small>HTTP examples use local Vite middleware, not a third-party service. Distributed tracing headers are automatic for same-origin HTTP calls.</small>
    </DemoCard>
  )
}
