import * as THREE from 'three';
import { type Props as ThrelteProps } from '@threlte/core';
import { type GridLayerProps } from './types';
import { type DisplayProps } from '../Stage/types';
interface Props extends ThrelteProps<typeof THREE.Mesh> {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
}
declare const GridLayer: import("svelte").Component<Props, {}, "">;
type GridLayer = ReturnType<typeof GridLayer>;
export default GridLayer;
