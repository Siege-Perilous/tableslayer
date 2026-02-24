interface MarkerData {
    id: string;
    title?: string;
    note?: unknown;
    visibility?: number;
    size?: number;
    tooltip?: {
        title?: string;
        content?: unknown;
    };
}
interface Props {
    marker: MarkerData | null;
    position: {
        x: number;
        y: number;
    } | null;
    containerElement: HTMLElement | null;
    markerDiameter?: number;
    onTooltipHover?: (isHovering: boolean) => void;
    isDM?: boolean;
    isPinned?: boolean;
    onPinToggle?: (markerId: string, pinned: boolean) => void;
    existingTooltips?: Array<{
        element: HTMLElement;
        bounds: DOMRect;
    }>;
    preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
    onTooltipMount?: (element: HTMLElement, bounds: DOMRect) => void;
    onTooltipUnmount?: (element: HTMLElement) => void;
}
declare const MarkerTooltip: import("svelte").Component<Props, {}, "">;
type MarkerTooltip = ReturnType<typeof MarkerTooltip>;
export default MarkerTooltip;
