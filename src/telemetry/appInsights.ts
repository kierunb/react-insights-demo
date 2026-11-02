import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin } from '@microsoft/applicationinsights-react-js';

// Create the React plugin for component tracking
const reactPlugin = new ReactPlugin();

// Initialize Application Insights
const appInsights = new ApplicationInsights({
  config: {
    // Your Application Insights connection string
    connectionString: import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING,
    // Extensions including the React plugin
    extensions: [reactPlugin],
    // Enable automatic tracking features
    enableAutoRouteTracking: true,
    // Track unhandled exceptions
    enableUnhandledPromiseRejectionTracking: true,
    // Disable telemetry in development if desired
    disableTelemetry: false,
    // Sample percentage (100 = all requests, 50 = half)
    samplingPercentage: 100,
    // Maximum number of AJAX calls tracked per page view
    maxAjaxCallsPerView: 50,
    // Track page visit duration
    autoTrackPageVisitTime: true,
  },
});

// Load the SDK and start collecting telemetry
appInsights.loadAppInsights();

// Track the initial page view
appInsights.trackPageView();

export { reactPlugin, appInsights };