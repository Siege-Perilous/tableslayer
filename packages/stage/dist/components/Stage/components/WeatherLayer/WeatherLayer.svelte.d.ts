import * as THREE from 'three';
import { type Props as ThrelteProps } from '@threlte/core';
import type { StageProps } from '../Stage/types';
interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: StageProps;
    size: {
        x: number;
        y: number;
    };
}
declare const WeatherLayer: import("svelte").Component<Props, {}, "">;
type WeatherLayer = ReturnType<typeof WeatherLayer>;
export default WeatherLayer;
