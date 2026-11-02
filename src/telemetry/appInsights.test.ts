// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApplicationInsights } from '@microsoft/applicationinsights-web'
import type { ITelemetryItem } from '@microsoft/applicationinsights-web'

const calls = vi.hoisted(() => ({
  load: vi.fn(),
  pageView: vi.fn(),
  initializer: vi.fn<(callback: (item: ITelemetryItem) => boolean | void) => void>(),
  record: vi.fn(),
}))

vi.mock('@microsoft/applicationinsights-web', () => ({
  ApplicationInsights: vi.fn(class {
    loadAppInsights = calls.load
    trackPageView = calls.pageView
    addTelemetryInitializer = calls.initializer
  }),
}))
vi.mock('@microsoft/applicationinsights-react-js', () => ({
  ReactPlugin: class { identifier = 'ReactPlugin' },
}))
vi.mock('@microsoft/applicationinsights-clickanalytics-js', () => ({
  ClickAnalyticsPlugin: class { identifier = 'ClickAnalyticsPlugin' },
}))
vi.mock('./telemetryLog', () => ({ recordTelemetry: calls.record }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('VITE_APPINSIGHTS_CONNECTION_STRING', 'InstrumentationKey=00000000-0000-0000-0000-000000000001')
  vi.stubEnv('VITE_APPINSIGHTS_PREVIEW', 'false')
})
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('SDK initialization and pipeline', () => {
  it('initializes once with one routing mechanism and privacy defaults', async () => {
    const { telemetryReady } = await import('./appInsights')
    expect(telemetryReady).toBe(true)
    expect(calls.load).toHaveBeenCalledOnce()
    expect(calls.pageView).toHaveBeenCalledOnce()
    expect(vi.mocked(ApplicationInsights).mock.calls[0][0].config).toMatchObject({
      enableAutoRouteTracking: true,
      enableUnhandledPromiseRejectionTracking: true,
      autoTrackPageVisitTime: true,
      samplingPercentage: 100,
      cookieCfg: { enabled: false },
      enableSessionStorageBuffer: false,
    })
  })

  it('enriches items and only filters the exact noise event', async () => {
    const { setNoiseFilter } = await import('./appInsights')
    const initialize = calls.initializer.mock.calls[0][0]
    const item: ITelemetryItem = { name: 'event', baseType: 'EventData', baseData: { name: 'demo.noise' } }
    expect(initialize(item)).toBe(true)
    expect(item.data).toMatchObject({ 'service.name': 'react-insights-demo', 'demo.source': 'react-playground' })
    setNoiseFilter(true)
    expect(initialize(item)).toBe(false)
    expect(calls.record).toHaveBeenLastCalledWith(item, 'filtered')
    expect(initialize({ name: 'exception', baseType: 'ExceptionData' })).toBe(true)
    expect(initialize({ name: 'event', baseType: 'EventData', baseData: { name: 'demo.checkout' } })).toBe(true)
    setNoiseFilter(false)
    expect(initialize(item)).toBe(true)
  })

  it('drops all outgoing items in explicit preview mode', async () => {
    vi.stubEnv('VITE_APPINSIGHTS_PREVIEW', 'true')
    await import('./appInsights')
    const item: ITelemetryItem = { name: 'event', baseType: 'EventData', baseData: { name: 'demo.checkout' } }
    expect(calls.initializer.mock.calls[0][0](item)).toBe(false)
    expect(calls.record).toHaveBeenLastCalledWith(item, 'preview')
  })

  it('does not load or emit a page view when configuration is absent', async () => {
    vi.stubEnv('VITE_APPINSIGHTS_CONNECTION_STRING', '  ')
    const { telemetryReady } = await import('./appInsights')
    expect(telemetryReady).toBe(false)
    expect(calls.load).not.toHaveBeenCalled()
    expect(calls.pageView).not.toHaveBeenCalled()
  })

  it('surfaces SDK initialization failure and does not report readiness', async () => {
    calls.load.mockImplementationOnce(() => { throw new Error('Invalid SDK configuration') })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { telemetryReady, telemetrySetupError } = await import('./appInsights')
    expect(telemetryReady).toBe(false)
    expect(telemetrySetupError).toBe('Invalid SDK configuration')
    expect(consoleError).toHaveBeenCalled()
    expect(calls.pageView).not.toHaveBeenCalled()
  })
})
