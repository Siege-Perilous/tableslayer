import * as THREE from 'three';
import { type Props as ThrelteProps } from '@threlte/core';
import type { Size } from '../../types';
import type { FogLayerProps } from './types';
interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: FogLayerProps;
    mapSize: Size | null;
}
declare const FogLayer: import("svelte").Component<Props, {}, "">;
type FogLayer = ReturnType<typeof FogLayer>;
export default FogLayer;
