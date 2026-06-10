import type { SelectAnnotation, SelectLight, SelectMarker, SelectScene } from '$lib/db/app/schema';
import type { AnnotationRow, LightRow, MarkerRow, SceneSettings } from './types';

// DB row -> doc row converters (app-side only; the PartyKit bundle never imports this).

export const sceneRowToSettings = (scene: SelectScene): SceneSettings => {
  const {
    fogOfWarMask: _fogOfWarMask,
    annotationLayers: _annotationLayers,
    lastUpdated: _lastUpdated,
    ...settings
  } = scene;
  return settings;
};

export const markerRowFromDb = (marker: SelectMarker): MarkerRow => marker;
export const lightRowFromDb = (light: SelectLight): LightRow => light;
export const annotationRowFromDb = (annotation: SelectAnnotation): AnnotationRow => {
  const { mask: _mask, ...row } = annotation;
  return row;
};
