interface Props {
    /** Key combination to toggle (default: F9) */
    shortcut?: string;
    /** Callback when debug state changes (optional, for external notification) */
    onToggle?: (enabled: boolean) => void;
    /** Disabled layers for A/B testing */
    disabledLayers?: string[];
}
declare const PerformanceDebugger: import("svelte").Component<Props, {
    /** Get debug props to spread into Stage props */ getDebugProps: () => {
        enableStats: boolean;
        loggingRate: number;
        enableMetrics: boolean;
        logMetricsToConsole: boolean;
        disabledLayers: string[];
    };
}, "">;
type PerformanceDebugger = ReturnType<typeof PerformanceDebugger>;
export default PerformanceDebugger;
