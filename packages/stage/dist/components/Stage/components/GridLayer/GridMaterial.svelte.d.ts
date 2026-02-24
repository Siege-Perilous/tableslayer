import type { GridLayerProps } from './types';
import type { DisplayProps } from '../Stage/types';
interface Props {
    grid: GridLayerProps;
    display: DisplayProps;
    sceneZoom: number;
}
declare const GridMaterial: import("svelte").Component<Props, {}, "">;
type GridMaterial = ReturnType<typeof GridMaterial>;
export default GridMaterial;
