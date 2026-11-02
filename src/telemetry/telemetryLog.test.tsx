// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { clearTelemetryLog, recordTelemetry, useTelemetryLog } from './telemetryLog'

beforeEach(clearTelemetryLog)
afterEach(cleanup)

it('retains the newest 60 entries and excludes envelope keys', () => {
  const { result } = renderHook(useTelemetryLog)
  act(() => {
    for (let index = 0; index < 65; index++) {
      recordTelemetry({
        name: 'envelope',
        iKey: 'not-for-the-inspector',
        baseType: 'EventData',
        baseData: { name: `event-${index}`, properties: { plan: 'starter' } },
      }, 'queued')
    }
  })
  expect(result.current).toHaveLength(60)
  expect(result.current[0].name).toBe('event-64')
  expect(result.current[59].name).toBe('event-5')
  expect(JSON.stringify(result.current)).not.toContain('not-for-the-inspector')
  expect(JSON.parse(result.current[0].details).properties.plan).toBe('starter')
  act(clearTelemetryLog)
  expect(result.current).toHaveLength(0)
})

it('keeps metric names, disposition and numeric measurements', () => {
  const { result } = renderHook(useTelemetryLog)
  act(() => recordTelemetry({
    name: 'metric',
    baseType: 'MetricData',
    baseData: { metrics: [{ name: 'demo.cart.items', value: 42 }] },
  }, 'preview'))
  expect(result.current[0].name).toBe('demo.cart.items')
  expect(result.current[0].disposition).toBe('preview')
  expect(JSON.parse(result.current[0].details).measurements[0].value).toBe(42)
})

it('preserves the pre-channel metric values and severity actually supplied by the SDK', () => {
  const { result } = renderHook(useTelemetryLog)
  act(() => recordTelemetry({
    name: 'envelope',
    baseType: 'MetricData',
    baseData: { name: 'React Component Engaged Time (seconds)', average: 2.5, sampleCount: 1 },
  }, 'preview'))
  expect(JSON.parse(result.current[0].details).metric).toEqual({ average: 2.5, sampleCount: 1 })
  act(() => recordTelemetry({
    name: 'trace',
    baseType: 'MessageData',
    baseData: { message: 'Demo warning', severityLevel: 2 },
  }, 'queued'))
  expect(JSON.parse(result.current[0].details).severityLevel).toBe(2)
})
