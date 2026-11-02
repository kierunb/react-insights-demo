import { useEffect, useState } from 'react';
import { appInsights } from '../telemetry/appInsights';

/** Reports render-to-effect elapsed milliseconds, not React CPU render duration. */
export function useComponentPerformance(componentName: string) {
  const [startTime] = useState(() => performance.now());

  useEffect(() => {
    const duration = performance.now() - startTime;

    appInsights.trackMetric({
      name: `Component.${componentName}.RenderTime`,
      average: duration,
    });

    if (duration > 100) {
      appInsights.trackTrace({
        message: `Slow component render: ${componentName} took ${duration.toFixed(0)}ms`,
        severityLevel: 2, // Warning
      });
    }
  }, [componentName, startTime]);
}

/**
 * Measures a custom async operation and rethrows failures.
 * Do not wrap fetch/XHR: the SDK already tracks those as HTTP dependencies.
 */
export async function trackApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;

    appInsights.trackDependencyData({
      id: crypto.randomUUID().replaceAll('-', ''),
      name,
      duration,
      success: true,
      responseCode: 0,
      type: 'InProc',
      target: 'demo-worker',
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    appInsights.trackDependencyData({
      id: crypto.randomUUID().replaceAll('-', ''),
      name,
      duration,
      success: false,
      responseCode: 1,
      type: 'InProc',
      target: 'demo-worker',
    });

    throw error;
  }
}