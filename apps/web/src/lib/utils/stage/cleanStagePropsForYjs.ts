import type { StageProps } from '@tableslayer/ui';

/**
 * Clean stage props for Y.js synchronization
 * Removes local-only properties that shouldn't be synced
 *
 * @param props - The stage props to clean
 * @returns Cleaned props suitable for Y.js
 */
export function cleanStagePropsForYjs(props: StageProps): any {
  return {
    ...props,
    annotations: {
      ...props.annotations,
      activeLayer: null,
      lineWidth: undefined
    },
    fogOfWar: {
      ...props.fogOfWar,
      tool: {
        ...props.fogOfWar.tool
      }
    },
    grid: {
      ...props.grid,
      worldGridUnits: props.grid.worldGridUnits || 'FT',
      worldGridSize: props.grid.worldGridSize || 5
    }
  };
}
