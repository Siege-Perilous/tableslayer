import { AnnotationEffect } from '../Stage/components/AnnotationLayer/types';
interface Props {
    effectType: AnnotationEffect;
    size?: string;
    shape?: 'circle' | 'rounded';
}
declare const EffectPreview: import("svelte").Component<Props, {}, "">;
type EffectPreview = ReturnType<typeof EffectPreview>;
export default EffectPreview;
