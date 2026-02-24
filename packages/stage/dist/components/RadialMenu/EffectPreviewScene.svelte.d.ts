import { AnnotationEffect } from '../Stage/components/AnnotationLayer/types';
interface Props {
    effectType: AnnotationEffect;
    shape?: 'circle' | 'rounded';
}
declare const EffectPreviewScene: import("svelte").Component<Props, {}, "">;
type EffectPreviewScene = ReturnType<typeof EffectPreviewScene>;
export default EffectPreviewScene;
