export interface EdgeOverlayProps {
  /**
   * URL of the overlay texture
   */
  url: string | null;

  /**
   * Opacity of the overlay
   */
  opacity: number;

  /**
   * Texture scale of the overlay
   */
  scale: number;

  /**
   * Distance from center where fade starts (0-1)
   */
  fadeStart: number;

  /**
   * Distance from center where fade ends (0-1)
   */
  fadeEnd: number;
}
