import * as THREE from 'three';
import { type Props as ThrelteProps } from '@threlte/core';
import { type Marker } from './types';
import { type StageProps } from '../Stage/types';
import type { GridLayerProps } from '../GridLayer/types';
import type { DisplayProps } from '../Stage/types';
interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    isActive: boolean;
    grid: GridLayerProps;
    display: DisplayProps;
}
declare const MarkerLayer: import("svelte").Component<Props, {
    maintainHover: (maintain: boolean) => void;
    onSceneChange: () => void;
    markerState: {
        readonly isHovering: boolean;
        readonly isDragging: boolean;
        readonly hoveredMarker: Marker | null;
        readonly selectedMarker: Marker | null;
    };
}, "">;
type MarkerLayer = ReturnType<typeof MarkerLayer>;
export default MarkerLayer;
