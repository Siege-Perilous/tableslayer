/**
 * Global debug state that persists independently of stageProps.
 * This prevents debug settings from being reset when stageProps are rebuilt.
 */
export declare const debugState: {
    enableMetrics: boolean;
    logMetricsToConsole: boolean;
};
export declare const setDebugEnabled: (enabled: boolean) => void;
export declare const isDebugEnabled: () => boolean;
