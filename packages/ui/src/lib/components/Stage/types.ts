import { type GridProps } from './layers/Grid/types';

/**
 * Props for the Stage component
 */
export type StageProps = {
  /**
   * Configuration for the Background layer
   */
  background: {
    /**
     * The background color represented as a hexadecimal string. If undefined, black is used as the default color.
     */
    color: string;
  };
  grid: GridProps;
};
