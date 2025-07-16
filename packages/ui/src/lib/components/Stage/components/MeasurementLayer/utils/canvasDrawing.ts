/**
 * Utility functions for drawing shapes on canvas
 */

/**
 * Draws a line, optionally with an outline
 * @param context Canvas 2D context
 * @param startX Start X coordinate
 * @param startY Start Y coordinate
 * @param endX End X coordinate
 * @param endY End Y coordinate
 * @param color Line color
 * @param thickness Line thickness
 * @param outlineColor Optional outline color
 * @param outlineThickness Optional outline thickness
 */
export function drawLine(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  color: string,
  thickness: number,
  outlineColor?: string,
  outlineThickness?: number
): void {
  // Draw outline if specified
  if (outlineColor && outlineThickness) {
    context.strokeStyle = outlineColor;
    context.lineWidth = thickness + outlineThickness * 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  }

  // Draw the line
  context.strokeStyle = color;
  context.lineWidth = thickness;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(startX, startY);
  context.lineTo(endX, endY);
  context.stroke();
}

/**
 * Draws a circle, optionally with an outline
 * @param context Canvas 2D context
 * @param x Center X coordinate
 * @param y Center Y coordinate
 * @param radius Circle radius
 * @param color Circle color
 * @param outlineColor Optional outline color
 * @param outlineThickness Optional outline thickness
 */
export function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  outlineColor?: string,
  outlineThickness?: number
): void {
  // Draw outline if specified
  if (outlineColor && outlineThickness) {
    context.beginPath();
    context.arc(x, y, radius + outlineThickness, 0, Math.PI * 2);
    context.fillStyle = outlineColor;
    context.fill();
  }

  // Draw the circle
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

/**
 * Creates a text canvas with consistent styling
 * @param text The text to display
 * @param fontSize Font size in pixels
 * @param color Text color
 * @param outlineColor Outline color
 * @param outlineThickness Outline thickness
 * @returns Canvas element with rendered text
 */
export function createTextCanvas(
  text: string,
  fontSize: number,
  color: string,
  outlineColor: string = '#000000',
  outlineThickness: number = 16
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  // Set canvas size
  canvas.width = 1024;
  canvas.height = 1024;

  // Clear canvas
  context.clearRect(0, 0, canvas.width, canvas.height);

  context.moveTo(-canvas.width / 2, -canvas.height / 2);

  // Set text properties
  context.font = `${fontSize}px Raven Hell`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Draw text outline
  context.strokeStyle = outlineColor;
  context.fillStyle = 'transparent';
  context.lineWidth = outlineThickness * 4;
  context.strokeText(text, canvas.width / 2, canvas.height / 2, canvas.width);

  // Draw text fill
  context.fillStyle = color;
  context.strokeStyle = 'transparent';
  context.fillText(text, canvas.width / 2, canvas.height / 2, canvas.width);

  return canvas;
}
