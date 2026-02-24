import type { StageProps } from '../Stage/types';
interface Props {
    minZoom: number;
    maxZoom: number;
    zoomSensitivity: number;
    stageElement: HTMLDivElement;
    stageProps: StageProps;
    onMapPan: (dx: number, dy: number) => void;
    onMapRotate: (angle: number) => void;
    onMapZoom: (zoom: number) => void;
    onScenePan: (dx: number, dy: number) => void;
    onSceneRotate: (angle: number) => void;
    onSceneZoom: (zoom: number) => void;
}
declare const PointerInputManager: import("svelte").Component<Props, {}, "">;
type PointerInputManager = ReturnType<typeof PointerInputManager>;
export default PointerInputManager;
