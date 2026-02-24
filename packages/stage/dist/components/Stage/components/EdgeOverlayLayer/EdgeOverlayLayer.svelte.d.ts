import * as THREE from 'three';
import { type Props as ThrelteProps } from '@threlte/core';
import type { EdgeOverlayProps } from './types';
import type { DisplayProps } from '../Stage/types';
interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: EdgeOverlayProps;
    display: DisplayProps;
}
declare const EdgeOverlayLayer: import("svelte").Component<Props, {}, "">;
type EdgeOverlayLayer = ReturnType<typeof EdgeOverlayLayer>;
export default EdgeOverlayLayer;
