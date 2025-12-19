import type { StageProps } from '@tableslayer/ui';

/**
 * Build measurement properties object from stageProps
 * Used when broadcasting measurements via Y.js
 *
 * @param stageProps - The current stage props
 * @returns Measurement properties for Y.js
 */
export function buildMeasurementProps(stageProps: StageProps) {
  return {
    color: stageProps.measurement.color,
    thickness: stageProps.measurement.thickness,
    outlineColor: stageProps.measurement.outlineColor,
    outlineThickness: stageProps.measurement.outlineThickness,
    opacity: stageProps.measurement.opacity,
    markerSize: stageProps.measurement.markerSize,
    autoHideDelay: stageProps.measurement.autoHideDelay,
    fadeoutTime: stageProps.measurement.fadeoutTime,
    showDistance: stageProps.measurement.showDistance,
    snapToGrid: stageProps.measurement.snapToGrid,
    enableDMG252: stageProps.measurement.enableDMG252,
    beamWidth: stageProps.measurement.beamWidth,
    coneAngle: stageProps.measurement.coneAngle
  };
}
