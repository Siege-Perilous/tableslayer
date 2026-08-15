import type { PostProcessingProps } from '../components/Scene/types';
import { PERFORMANCE_TIER_SETTINGS, type PerformanceTier } from '../components/Stage/types';

// Effects with zero-strength settings contribute nothing visible, so treat
// them as disabled; this lets the render loop bypass the composer entirely
export const getActiveEffects = (pp: PostProcessingProps) => ({
  bloom: pp.bloom.enabled && pp.bloom.intensity > 0,
  chromaticAberration: pp.chromaticAberration.enabled && pp.chromaticAberration.offset !== 0,
  vignette: pp.vignette.enabled && pp.vignette.darkness > 0,
  lut: pp.lut.enabled && pp.lut.url !== null
});

// Whether the Main pass goes through the EffectComposer (into a render target)
// rather than straight to the canvas
export const hasActivePostProcessing = (pp: PostProcessingProps, tier: PerformanceTier = 'high') => {
  if (PERFORMANCE_TIER_SETTINGS[tier].forcePostProcessingOff) return false;
  if (!pp.enabled) return false;
  const activeEffects = getActiveEffects(pp);
  return activeEffects.bloom || activeEffects.chromaticAberration || activeEffects.vignette || activeEffects.lut;
};
