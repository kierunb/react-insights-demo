import { useCallback } from 'react';
import { appInsights } from '../telemetry/appInsights';

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

/** Tracks SDK telemetry; numeric event measurements remain separate from properties. */
export function useTracking() {
  const trackEvent = useCallback(
    (name: string, properties?: Record<string, string>, measurements?: Record<string, number>) => {
      appInsights.trackEvent({ name, properties, measurements });
    },
    []
  );

  const trackPageView = useCallback((name: string, uri?: string) => {
    appInsights.trackPageView({ name, uri });
  }, []);

  const trackMetric = useCallback((name: string, average: number) => {
    appInsights.trackMetric({ name, average });
  }, []);

  const trackException = useCallback((error: Error, properties?: Record<string, string>) => {
    appInsights.trackException({ exception: error }, properties);
  }, []);

  const setUser = useCallback((userId: string, accountId?: string) => {
    appInsights.setAuthenticatedUserContext(userId, accountId, false);
  }, []);

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