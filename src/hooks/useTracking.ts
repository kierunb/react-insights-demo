import { useCallback } from 'react';
import { appInsights } from '../telemetry/appInsights';

// Define event names as constants to prevent typos
export const TrackingEvents = {
  BUTTON_CLICK: 'ButtonClick',
  FORM_SUBMIT: 'FormSubmit',
  FEATURE_USED: 'FeatureUsed',
  SEARCH_PERFORMED: 'SearchPerformed',
  ITEM_ADDED_TO_CART: 'ItemAddedToCart',
  CHECKOUT_STARTED: 'CheckoutStarted',
  CHECKOUT_COMPLETED: 'CheckoutCompleted',
  ERROR_DISPLAYED: 'ErrorDisplayed',
} as const;

export function useTracking() {
  // Track a custom event with optional properties
  const trackEvent = useCallback(
    (name: string, properties?: Record<string, string>, measurements?: Record<string, number>) => {
      appInsights.trackEvent({ name }, { ...properties, ...measurements });
    },
    []
  );

  // Track a page view with custom name
  const trackPageView = useCallback((name: string, uri?: string) => {
    appInsights.trackPageView({ name, uri });
  }, []);

  // Track a metric value
  const trackMetric = useCallback((name: string, average: number) => {
    appInsights.trackMetric({ name, average });
  }, []);

  // Track an exception
  const trackException = useCallback((error: Error, properties?: Record<string, string>) => {
    appInsights.trackException({ exception: error }, properties);
  }, []);

  // Set the authenticated user context
  const setUser = useCallback((userId: string, accountId?: string) => {
    appInsights.setAuthenticatedUserContext(userId, accountId, true);
  }, []);

  // Clear user context on logout
  const clearUser = useCallback(() => {
    appInsights.clearAuthenticatedUserContext();
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackMetric,
    trackException,
    setUser,
    clearUser,
  };
}