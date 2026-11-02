import { useSyncExternalStore } from 'react'
import type { ITelemetryItem } from '@microsoft/applicationinsights-web'

/** A local pre-channel snapshot, not an Azure ingestion acknowledgement. */
export interface TelemetryEntry {
  id: number
  time: string
  type: string
  name: string
  disposition: 'queued' | 'filtered' | 'preview'
  details: string
}

let entries: readonly TelemetryEntry[] = []
let nextId = 0
const listeners = new Set<() => void>()

/** Retains the latest 60 items without copying SDK keys or the full envelope. */
export function recordTelemetry(
  item: ITelemetryItem,
  disposition: TelemetryEntry['disposition'],
) {
  const data = item.baseData ?? {}
  entries = [{
    id: ++nextId,
    time: new Date().toLocaleTimeString(),
    type: item.baseType ?? 'Telemetry',
    name: data.name ?? data.metrics?.[0]?.name ?? data.message ?? data.exceptions?.[0]?.message ?? item.baseType ?? 'Telemetry',
    disposition,
    details: JSON.stringify({
      properties: { ...item.data, ...data.properties },
      measurements: data.measurements ?? data.metrics,
      metric: item.baseType === 'MetricData' ? {
        average: data.average,
        sampleCount: data.sampleCount,
        min: data.min,
        max: data.max,
      } : undefined,
      duration: data.duration ?? data.properties?.duration,
      severityLevel: data.severityLevel,
      success: data.success,
      responseCode: data.responseCode,
      dependencyType: data.type,
      url: data.uri,
      operationId: item.ext?.trace?.traceID,
      authenticatedUser: item.ext?.user?.authId,
      pagePerformance: item.baseType === 'PageviewPerformanceData' ? {
        total: data.perfTotal,
        network: data.networkConnect,
        request: data.sentRequest,
        response: data.receivedResponse,
        processing: data.domProcessing,
      } : undefined,
    }, null, 2),
  }, ...entries].slice(0, 60)
  listeners.forEach((listener) => listener())
}

/** Clears only the inspector; it does not clear the SDK's send buffer. */
export function clearTelemetryLog() {
  entries = []
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Subscribes to telemetry captured before SDK channel processing. */
export function useTelemetryLog() {
  return useSyncExternalStore(subscribe, () => entries)
}
