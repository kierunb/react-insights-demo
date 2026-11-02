import { useState } from 'react'
import { useAppInsightsContext, useTrackEvent } from '@microsoft/applicationinsights-react-js'
import { useTracking } from '../hooks/useTracking'
import { DemoCard } from './DemoCard'

export function EventDemo() {
  const plugin = useAppInsightsContext()
  const trackCart = useTrackEvent(plugin, 'demo.cart.updated', { itemCount: 0 }, true)
  const { trackEvent } = useTracking()
  const [count, setCount] = useState(0)
  const [message, setMessage] = useState('No events yet.')

  function addProduct() {
    const itemCount = count + 1
    setCount(itemCount)
    trackCart({ itemCount })
    setMessage(`Cart has ${itemCount} items. Hook state change tracked.`)
  }

  return (
    <DemoCard
      id="events" title="Events & React context"
      api="useAppInsightsContext / useTrackEvent"
      description="Get the React plugin from context. Track a cart state change with a hook, or send an explicit event with a numeric measurement."
      output="customEvents"
      code={`const plugin = useAppInsightsContext()\nconst trackCart = useTrackEvent(plugin,\n  'demo.cart.updated', { itemCount: 0 }, true)\n// In a click handler:\ntrackCart({ itemCount: 1 })\n\nappInsights.trackEvent({\n  name: 'demo.checkout',\n  properties: { plan: 'starter' },\n  measurements: { itemCount: 1 },\n})`}
    >
      <div className="button-row">
        <button onClick={addProduct}>Add product ({count})</button>
        <button className="secondary" onClick={() => {
          trackEvent('demo.checkout', { plan: 'starter' }, { itemCount: count })
          setMessage('Checkout event captured with properties and measurements.')
        }}>Track checkout</button>
      </div>
      <p className="feedback" role="status">{message}</p>
      <small>The hook skips its initial effect. It tracks state updates, not every render.</small>
    </DemoCard>
  )
}
