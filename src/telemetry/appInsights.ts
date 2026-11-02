import { ApplicationInsights } from '@microsoft/applicationinsights-web'
import { ReactPlugin } from '@microsoft/applicationinsights-react-js'
import { ClickAnalyticsPlugin } from '@microsoft/applicationinsights-clickanalytics-js'
import { recordTelemetry } from './telemetryLog'

export const reactPlugin = new ReactPlugin()
const clickPlugin = new ClickAnalyticsPlugin()
const connectionString = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING?.trim()
export const previewMode = import.meta.env.VITE_APPINSIGHTS_PREVIEW === 'true'
let filterNoise = false

/** Filters only the deliberately noisy sample event, never real failures. */
export function setNoiseFilter(enabled: boolean) {
  filterNoise = enabled
}

export const appInsights = new ApplicationInsights({
  config: {
    connectionString,
    extensions: [reactPlugin, clickPlugin],
    extensionConfig: {
      [clickPlugin.identifier]: {
        autoCapture: true,
        dropInvalidEvents: true,
        dataTags: { useDefaultContentNameOrId: false },
      },
    },
    enableAutoRouteTracking: true,
    enableUnhandledPromiseRejectionTracking: true,
    enableAjaxPerfTracking: true,
    autoTrackPageVisitTime: true,
    samplingPercentage: 100,
    maxAjaxCallsPerView: 50,
    cookieCfg: { enabled: false },
    // Visit-time measurement needs session storage; keep the send buffer in memory.
    enableSessionStorageBuffer: false,
    // Keep Vite's development traffic out of the dependency examples.
    excludeRequestFromAutoTrackingPatterns: [/\/@vite\//, /\/src\//, /\/node_modules\//],
  },
})

appInsights.addTelemetryInitializer((item) => {
  item.data = {
    ...item.data,
    'service.name': 'react-insights-demo',
    'service.version': '1.0.0',
    'deployment.environment': import.meta.env.MODE,
    'demo.source': 'react-playground',
  }
  const filtered = filterNoise && item.baseType === 'EventData'
    && item.baseData?.name === 'demo.noise'
  recordTelemetry(item, filtered ? 'filtered' : previewMode ? 'preview' : 'queued')
  // Preview still exercises the real plugins but drops every item before the sender.
  return !filtered && !previewMode
})

let setupError: string | undefined
if (connectionString) {
  try {
    appInsights.loadAppInsights()
    appInsights.trackPageView({ name: 'React Insights' })
  } catch (error) {
    setupError = error instanceof Error ? error.message : String(error)
    console.error('Application Insights initialization failed:', error)
  }
}

export const telemetrySetupError = setupError
export const telemetryReady = Boolean(connectionString) && !setupError