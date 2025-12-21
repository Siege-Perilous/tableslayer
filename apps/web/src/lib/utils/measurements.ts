import type { StageProps } from '@tableslayer/ui';
import type { MeasurementData } from './yjs/PartyDataManager';

/**
 * Get the latest measurement from a collection by timestamp
 *
 * @param measurements - Record of user ID to measurement data
 * @returns The most recent measurement, or null if no measurements exist
 */
export function getLatestMeasurement(measurements: Record<string, MeasurementData>): MeasurementData | null {
  const measurementValues = Object.values(measurements);
  if (measurementValues.length === 0) return null;

  return measurementValues.reduce((latest, current) => (current.timestamp > latest.timestamp ? current : latest));
}

/**
 * Extract measurement properties from stageProps for Y.js broadcasting
 *
 * @param measurement - The measurement configuration from stageProps
 * @returns Object containing only the properties needed for Y.js sync
 */
export function extractMeasurementProps(measurement: StageProps['measurement']) {
  return {
    color: measurement.color,
    thickness: measurement.thickness,
    outlineColor: measurement.outlineColor,
    outlineThickness: measurement.outlineThickness,
    opacity: measurement.opacity,
    markerSize: measurement.markerSize,
    autoHideDelay: measurement.autoHideDelay,
    fadeoutTime: measurement.fadeoutTime,
    showDistance: measurement.showDistance,
    snapToGrid: measurement.snapToGrid,
    enableDMG252: measurement.enableDMG252,
    beamWidth: measurement.beamWidth,
    coneAngle: measurement.coneAngle
  };
}
