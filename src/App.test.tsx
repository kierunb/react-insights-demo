// @vitest-environment jsdom
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { AppInsightsContext } from '@microsoft/applicationinsights-react-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appInsights, reactPlugin } from './telemetry/appInsights'
import { useTracking } from './hooks/useTracking'
import { trackApiCall } from './hooks/usePerformanceTracking'
import { clearTelemetryLog } from './telemetry/telemetryLog'
import { MetricsDemo } from './components/MetricsDemo'
import App from './App'

const sdk = vi.hoisted(() => ({
  ready: true,
  trackEvent: vi.fn(),
  trackMetric: vi.fn(),
  trackPageView: vi.fn(),
  trackException: vi.fn(),
  trackTrace: vi.fn(),
  trackDependencyData: vi.fn(),
  setAuthenticatedUserContext: vi.fn(),
  clearAuthenticatedUserContext: vi.fn(),
  startTrackEvent: vi.fn(),
  stopTrackEvent: vi.fn(),
  startTrackPage: vi.fn(),
  stopTrackPage: vi.fn(),
  flush: vi.fn(),
  setEnabled: vi.fn(),
  purge: vi.fn(),
  setNoiseFilter: vi.fn(),
}))

vi.mock('./telemetry/appInsights', async () => {
  const { ReactPlugin } = await import('@microsoft/applicationinsights-react-js')
  const plugin = new ReactPlugin()
  plugin.trackEvent = sdk.trackEvent
  plugin.trackMetric = sdk.trackMetric
  plugin.trackException = sdk.trackException
  return {
    reactPlugin: plugin,
    appInsights: { ...sdk, getCookieMgr: () => ({ setEnabled: sdk.setEnabled, purge: sdk.purge }) },
    get telemetryReady() { return sdk.ready },
    telemetrySetupError: undefined,
    previewMode: false,
    setNoiseFilter: sdk.setNoiseFilter,
  }
})

function renderApp() {
  return render(<StrictMode><AppInsightsContext.Provider value={reactPlugin}><App /></AppInsightsContext.Provider></StrictMode>)
}

beforeEach(() => {
  vi.clearAllMocks()
  sdk.ready = true
  history.replaceState({}, '', '/')
  clearTelemetryLog()
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('interactive examples', () => {
  it('skips the initial hook event in Strict Mode and captures a cart update', async () => {
    renderApp()
    expect(sdk.trackEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Add product (0)' }))
    await waitFor(() => expect(sdk.trackEvent).toHaveBeenCalledWith(
      { name: 'demo.cart.updated' }, { itemCount: 1 },
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Track checkout' }))
    expect(sdk.trackEvent).toHaveBeenLastCalledWith({
      name: 'demo.checkout', properties: { plan: 'starter' }, measurements: { itemCount: 1 },
    })
  })

  it('navigates through History API without manual page-view duplication', () => {
    renderApp()
    fireEvent.click(screen.getByRole('link', { name: 'Catalog' }))
    expect(location.pathname).toBe('/catalog')
    expect(document.title).toBe('React Insights | Catalog')
    expect(sdk.trackPageView).not.toHaveBeenCalled()
    act(() => {
      history.replaceState({}, '', '/checkout')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })
    expect(screen.getByText('Current route:').textContent).toContain('/checkout')
    expect(document.title).toBe('React Insights | Checkout')
  })

  it('emits engagement only after interaction and unmount for hook and HOC', async () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Mount hook widget' }))
    expect(sdk.trackMetric.mock.calls.some(([metric]) => metric.name === 'React Component Engaged Time (seconds)')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Interact with hook (0)' }))
    await act(() => new Promise((resolve) => setTimeout(resolve, 25)))
    fireEvent.click(screen.getByRole('button', { name: 'Hide hook widget' }))
    expect(sdk.trackMetric).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'React Component Engaged Time (seconds)', average: expect.any(Number) }),
      expect.objectContaining({ 'Component Name': 'HookWidget' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mount HOC widget' }))
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Interact with HOC (0)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Interact with HOC (0)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hide HOC widget' }))
    expect(sdk.trackMetric).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'React Component Engaged Time (seconds)' }),
      expect.objectContaining({ 'Component Name': 'HocWidget' }),
    )
  })

  it('catches a React render error and recovers with a fresh boundary', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Break render' }))
    expect(screen.getByRole('alert').textContent).toContain('boundary caught')
    expect(sdk.trackException).toHaveBeenCalledWith(expect.objectContaining({
      exception: expect.objectContaining({ message: 'Demo: React render failure' }),
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset boundary' }))
    expect(screen.getByText('The example widget is healthy.')).toBeTruthy()
  })

  it('tracks a caught exception explicitly at error severity', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Track caught exception' }))
    expect(sdk.trackException).toHaveBeenCalledExactlyOnceWith({
      exception: expect.objectContaining({ message: 'Demo: caught exception' }),
      severityLevel: 3,
    }, { scenario: 'caught' })
  })

  it('lets the handler error reach the browser without manually duplicating telemetry', () => {
    const onError = vi.fn((event: ErrorEvent) => event.preventDefault())
    window.addEventListener('error', onError)
    try {
      renderApp()
      fireEvent.click(screen.getByText('Browser-level error samples'))
      fireEvent.click(screen.getByRole('button', { name: 'Throw handler error' }))
      expect(onError).toHaveBeenCalledOnce()
      expect(onError.mock.calls[0][0].error).toMatchObject({ message: 'Demo: uncaught event-handler error' })
      expect(sdk.trackException).not.toHaveBeenCalled()
      expect(screen.getByText('The example widget is healthy.')).toBeTruthy()
    } finally {
      window.removeEventListener('error', onError)
    }
  })

  it('sends bounded metrics, trace severities and both timed APIs', () => {
    renderApp()
    fireEvent.change(screen.getByLabelText('Cart size: 42 items'), { target: { value: '75' } })
    fireEvent.click(screen.getByRole('button', { name: 'Track metric' }))
    expect(sdk.trackMetric).toHaveBeenCalledWith({ name: 'demo.cart.items', average: 75, sampleCount: 1 }, { unit: '1' })
    fireEvent.click(screen.getByRole('button', { name: 'Track information trace' }))
    expect(sdk.trackTrace).toHaveBeenCalledWith({
      message: 'Demo: information trace', severityLevel: 1,
    }, { scenario: 'test-page' })
    fireEvent.click(screen.getByRole('button', { name: 'Track warning trace' }))
    expect(sdk.trackTrace).toHaveBeenCalledWith(expect.objectContaining({ severityLevel: 2 }), { scenario: 'inventory' })
    fireEvent.click(screen.getByRole('button', { name: 'Start event timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop event timer' }))
    expect(sdk.startTrackEvent).toHaveBeenCalledWith('demo.timed.checkout')
    expect(sdk.stopTrackEvent).toHaveBeenCalledWith('demo.timed.checkout', { plan: 'starter' })
    fireEvent.click(screen.getByRole('button', { name: 'Start page timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop page timer' }))
    expect(sdk.startTrackPage).toHaveBeenCalledWith('Demo virtual page')
    expect(sdk.stopTrackPage).toHaveBeenCalledWith('Demo virtual page', `${location.origin}/virtual-page`)
  })

  it('shows elapsed page time, freezes on stop, and resets without extra page views', () => {
    vi.useFakeTimers()
    render(<StrictMode><MetricsDemo /></StrictMode>)
    const clock = screen.getByRole('timer', { name: 'Virtual page elapsed time' })
    const reset = screen.getByRole('button', { name: 'Reset clock' })
    expect(clock.textContent).toBe('0.000 s')
    expect(reset.hasAttribute('disabled')).toBe(true)
    expect(sdk.startTrackPage).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start page timer' }))
    expect(vi.getTimerCount()).toBe(1)
    expect(reset.hasAttribute('disabled')).toBe(true)
    act(() => vi.advanceTimersByTime(1250))
    expect(clock.textContent).toBe('1.200 s')
    expect(sdk.stopTrackPage).not.toHaveBeenCalled()
    fireEvent.click(reset)
    expect(clock.textContent).toBe('1.200 s')
    fireEvent.click(screen.getByRole('button', { name: 'Stop page timer' }))
    expect(clock.textContent).toBe('1.250 s')
    expect(vi.getTimerCount()).toBe(0)
    expect(reset.hasAttribute('disabled')).toBe(false)
    act(() => vi.advanceTimersByTime(1000))
    expect(clock.textContent).toBe('1.250 s')
    fireEvent.click(reset)
    expect(clock.textContent).toBe('0.000 s')
    expect(sdk.stopTrackPage).toHaveBeenCalledExactlyOnceWith('Demo virtual page', `${location.origin}/virtual-page`)
    expect(sdk.trackPageView).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Start page timer' }))
    expect(clock.textContent).toBe('0.000 s')
    act(() => vi.advanceTimersByTime(300))
    fireEvent.click(screen.getByRole('button', { name: 'Stop page timer' }))
    expect(clock.textContent).toBe('0.300 s')
    expect(sdk.startTrackPage).toHaveBeenCalledTimes(2)
    expect(sdk.stopTrackPage).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', { name: 'Start page timer' }))
    expect(clock.textContent).toBe('0.000 s')
    act(() => vi.advanceTimersByTime(200))
    fireEvent.click(screen.getByRole('button', { name: 'Stop page timer' }))
    expect(clock.textContent).toBe('0.200 s')
    expect(sdk.startTrackPage).toHaveBeenCalledTimes(3)
    expect(sdk.stopTrackPage).toHaveBeenCalledTimes(3)
  })

  it('clears the page clock interval on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = render(<StrictMode><MetricsDemo /></StrictMode>)
    fireEvent.click(screen.getByRole('button', { name: 'Start page timer' }))
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not double-track fetch and surfaces failed HTTP responses', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ demo: true }) })
      .mockResolvedValueOnce({ ok: false, status: 503 })
    vi.stubGlobal('fetch', fetchMock)
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Fetch success' }))
    await screen.findByText(/fetch: completed/)
    expect(fetchMock).toHaveBeenCalledWith('/api/demo/success')
    expect(sdk.trackDependencyData).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Fetch HTTP 503' }))
    await screen.findByText('Demo API returned HTTP 503')
  })

  it('runs the XHR sample without manually duplicating its dependency', async () => {
    const request = new XMLHttpRequest()
    vi.spyOn(request, 'open').mockImplementation(() => {})
    vi.spyOn(request, 'send').mockImplementation(() => request.dispatchEvent(new Event('load')))
    vi.spyOn(request, 'status', 'get').mockReturnValue(200)
    vi.spyOn(request, 'response', 'get').mockReturnValue({ demo: true })
    vi.stubGlobal('XMLHttpRequest', vi.fn(function () { return request }))
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'XHR success' }))
    await screen.findByText(/xhr: completed/)
    expect(request.open).toHaveBeenCalledWith('GET', '/api/demo/success')
    expect(request.send).toHaveBeenCalledOnce()
    expect(sdk.trackDependencyData).not.toHaveBeenCalled()
  })

  it('uses fictional non-persisted identity and clears context and cookies', () => {
    renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Set demo identity' }))
    expect(sdk.setAuthenticatedUserContext).toHaveBeenCalledWith('demo-user', 'demo-account', false)
    fireEvent.click(screen.getByRole('button', { name: 'Clear demo identity' }))
    expect(sdk.clearAuthenticatedUserContext).toHaveBeenCalledOnce()
    const cookies = screen.getByLabelText('Allow SDK cookies for this session')
    fireEvent.click(cookies)
    expect(sdk.setEnabled).toHaveBeenLastCalledWith(true)
    fireEvent.click(cookies)
    expect(sdk.setEnabled).toHaveBeenLastCalledWith(false)
    expect(sdk.purge.mock.calls.map(([name]) => name)).toEqual(['ai_user', 'ai_session', 'ai_authUser'])
  })

  it('exposes filter controls, flush semantics and click tagging', () => {
    renderApp()
    fireEvent.click(screen.getByLabelText('Filter the noisy sample event'))
    expect(sdk.setNoiseFilter).toHaveBeenCalledWith(true)
    fireEvent.click(screen.getByRole('button', { name: 'Emit noisy event' }))
    expect(sdk.trackEvent).toHaveBeenCalledWith({ name: 'demo.noise' })
    fireEvent.click(screen.getByRole('button', { name: 'Flush buffer' }))
    expect(sdk.flush).toHaveBeenCalledOnce()
    expect(screen.getByText(/Flush requested/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Explore tagged offer' }).getAttribute('data-id')).toBe('demo-offer')
    expect(screen.getByRole('button', { name: 'Do not track this click' }).getAttribute('data-ai-dnt')).toBe('true')
  })

  it('disables actions and shows setup instructions when unconfigured', () => {
    sdk.ready = false
    renderApp()
    expect(screen.getByRole('alert').textContent).toContain('VITE_APPINSIGHTS_CONNECTION_STRING')
    expect(screen.getByRole('group', { name: 'Telemetry examples' }).hasAttribute('disabled')).toBe(true)
    expect(sdk.trackEvent).not.toHaveBeenCalled()
  })
})

describe('shared SDK helpers', () => {
  it('preserves numeric measurements rather than merging them into dimensions', () => {
    const { result } = renderHook(useTracking)
    result.current.trackEvent('example', { plan: 'starter' }, { amount: 3 })
    expect(appInsights.trackEvent).toHaveBeenCalledWith({
      name: 'example', properties: { plan: 'starter' }, measurements: { amount: 3 },
    })
  })

  it('tracks custom operation success without claiming an HTTP status', async () => {
    await expect(trackApiCall('demo.operation', async () => 42)).resolves.toBe(42)
    expect(sdk.trackDependencyData).toHaveBeenCalledWith(expect.objectContaining({
      type: 'InProc', success: true, responseCode: 0, target: 'demo-worker',
    }))
  })

  it('records custom operation failure and rethrows the original error', async () => {
    const error = new Error('Expected failure')
    await expect(trackApiCall('demo.operation', async () => { throw error })).rejects.toBe(error)
    expect(sdk.trackDependencyData).toHaveBeenCalledWith(expect.objectContaining({
      type: 'InProc', success: false, responseCode: 1,
    }))
  })
})
