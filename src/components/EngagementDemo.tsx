import { useState } from 'react'
import { useAppInsightsContext, useTrackMetric, withAITracking } from '@microsoft/applicationinsights-react-js'
import { reactPlugin } from '../telemetry/appInsights'
import { useComponentPerformance } from '../hooks/usePerformanceTracking'
import { DemoCard } from './DemoCard'

function HookWidget() {
  const plugin = useAppInsightsContext()
  const trackActivity = useTrackMetric(plugin, 'HookWidget')
  useComponentPerformance('HookWidget')
  const [clicks, setClicks] = useState(0)

  return (
    <div className="interaction-zone" onMouseMove={trackActivity}
      onKeyDown={trackActivity} onClick={trackActivity}>
      <strong>Hook widget</strong>
      <button className="secondary" onClick={() => setClicks(clicks + 1)}>
        Interact with hook ({clicks})
      </button>
    </div>
  )
}

function HocWidget() {
  const [clicks, setClicks] = useState(0)
  return (
    <div className="interaction-zone">
      <strong>Higher-order component widget</strong>
      <button className="secondary" onClick={() => setClicks(clicks + 1)}>
        Interact with HOC ({clicks})
      </button>
    </div>
  )
}

const TrackedHocWidget = withAITracking(reactPlugin, HocWidget, 'HocWidget', 'tracked-widget')

export function EngagementDemo() {
  const [showHook, setShowHook] = useState(false)
  const [showHoc, setShowHoc] = useState(false)

  return (
    <DemoCard id="engagement" title="Component engagement"
      api="useTrackMetric / withAITracking"
      description="Mount a widget, interact for a few seconds, then hide it. Both approaches report engaged time on unmount, excluding idle time."
      output="React Component Engaged Time (seconds)"
      code={`const trackActivity = useTrackMetric(plugin, 'HookWidget')\nreturn <div onMouseMove={trackActivity}\n  onClick={trackActivity} onKeyDown={trackActivity}>...</div>\n\nconst TrackedWidget = withAITracking(\n  reactPlugin, Widget, 'HocWidget')`}
    >
      <div className="button-row">
        <button onClick={() => setShowHook(!showHook)}>{showHook ? 'Hide' : 'Mount'} hook widget</button>
        <button className="secondary" onClick={() => setShowHoc(!showHoc)}>{showHoc ? 'Hide' : 'Mount'} HOC widget</button>
      </div>
      {showHook && <HookWidget />}
      {showHoc && <TrackedHocWidget />}
      <small>No engagement metric is emitted until you interact and unmount. Mounting the hook widget also emits a render-to-effect timing estimate.</small>
    </DemoCard>
  )
}
