import { useEffect, useRef } from 'react';
import { appInsights } from '../telemetry/appInsights';

// Track how long a component takes to mount
export function useComponentPerformance(componentName: string) {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const duration = performance.now() - startTime.current;

    // Report component render time as a custom metric
    appInsights.trackMetric({
      name: `Component.${componentName}.RenderTime`,
      average: duration,
    });

    // Log a warning for slow components
    if (duration > 100) {
      appInsights.trackTrace({
        message: `Slow component render: ${componentName} took ${duration.toFixed(0)}ms`,
        severityLevel: 2, // Warning
      });
    }
  }, [componentName]);
}

// Track API call performance
export async function trackApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await apiCall();
    const duration = performance.now() - startTime;

    appInsights.trackDependencyData({
      id: `api-${Date.now()}`,
      name,
      duration,
      success: true,
      responseCode: 200,
      type: 'HTTP',
      target: name,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;

    appInsights.trackDependencyData({
      id: `api-${Date.now()}`,
      name,
      duration,
      success: false,
      responseCode: 500,
      type: 'HTTP',
      target: name,
    });

    throw error;
  }
}