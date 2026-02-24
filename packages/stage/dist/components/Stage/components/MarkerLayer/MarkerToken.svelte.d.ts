import { type Marker } from './types';
import type { GridLayerProps } from '../GridLayer/types';
import type { DisplayProps } from '../Stage/types';
interface Props {
    marker: Marker;
    grid: GridLayerProps;
    display: DisplayProps;
    opacity: number;
    strokeColor: string;
    strokeWidth: number;
    shadowColor: string;
    shadowBlur: number;
    shadowOffset: {
        x: number;
        y: number;
    };
    textColor: string;
    textStroke: number;
    textStrokeColor: string;
    textSize: number;
    isSelected: boolean;
    isHovered?: boolean;
    sceneRotation: number;
}
declare const MarkerToken: import("svelte").Component<Props, {}, "">;
type MarkerToken = ReturnType<typeof MarkerToken>;
export default MarkerToken;
