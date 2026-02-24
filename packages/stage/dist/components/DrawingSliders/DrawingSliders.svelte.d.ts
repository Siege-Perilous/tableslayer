import { AnnotationEffect } from '../Stage/components/AnnotationLayer/types';
interface Props {
    opacity: number;
    brushSize: number;
    color: string;
    activeLayerIndex: number;
    currentEffect?: AnnotationEffect;
    onOpacityChange: (value: number) => void;
    onBrushSizeChange: (value: number) => void;
    onColorChange: (color: string, opacity: number) => void;
    onEffectChange?: (effect: AnnotationEffect) => void;
    onLayersClick: () => void;
}
declare const DrawingSliders: import("svelte").Component<Props, {}, "">;
type DrawingSliders = ReturnType<typeof DrawingSliders>;
export default DrawingSliders;
