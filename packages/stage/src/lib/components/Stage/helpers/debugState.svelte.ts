/**
 * Global debug state that persists independently of stageProps.
 * This prevents debug settings from being reset when stageProps are rebuilt.
 */
export const debugState: {
  enableMetrics: boolean;
  logMetricsToConsole: boolean;
} = $state({
  enableMetrics: false,
  logMetricsToConsole: false
});

export const setDebugEnabled = (enabled: boolean) => {
  debugState.enableMetrics = enabled;
  debugState.logMetricsToConsole = enabled;
};

export const isDebugEnabled = () => debugState.enableMetrics;
