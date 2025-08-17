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
 * Draws a large circle with stroke and optional fill
 * @param context Canvas 2D context
 * @param x Center X coordinate
 * @param y Center Y coordinate
 * @param radius Circle radius
 * @param strokeColor Stroke color
 * @param strokeThickness Stroke thickness
 * @param fillColor Optional fill color
 * @param fillOpacity Optional fill opacity (0-1)
 * @param outlineColor Optional outline color
 * @param outlineThickness Optional outline thickness
 */
export function drawLargeCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  strokeColor: string,
  strokeThickness: number,
  fillColor?: string,
  fillOpacity?: number,
  outlineColor?: string,
  outlineThickness?: number
): void {
  // Draw fill if specified
  if (fillColor && fillOpacity !== undefined) {
    const originalAlpha = context.globalAlpha;
    context.globalAlpha = fillOpacity;
    context.fillStyle = fillColor;
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.fill();
    context.globalAlpha = originalAlpha;
  }

  // Draw outline if specified
  if (outlineColor && outlineThickness) {
    context.strokeStyle = outlineColor;
    context.lineWidth = strokeThickness + outlineThickness * 2;
    context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI);
    context.stroke();
  }

  // Draw the main stroke
  context.strokeStyle = strokeColor;
  context.lineWidth = strokeThickness;
  context.beginPath();
  context.arc(x, y, radius, 0, 2 * Math.PI);
  context.stroke();
}

/**
 * Draws a rectangle with stroke and optional fill
 * @param context Canvas 2D context
 * @param x Top-left X coordinate
 * @param y Top-left Y coordinate
 * @param width Rectangle width
 * @param height Rectangle height
 * @param strokeColor Stroke color
 * @param strokeThickness Stroke thickness
 * @param fillColor Optional fill color
 * @param fillOpacity Optional fill opacity (0-1)
 * @param outlineColor Optional outline color
 * @param outlineThickness Optional outline thickness
 */
export function drawRectangle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  strokeColor: string,
  strokeThickness: number,
  fillColor?: string,
  fillOpacity?: number,
  outlineColor?: string,
  outlineThickness?: number
): void {
  // Draw fill if specified
  if (fillColor && fillOpacity !== undefined) {
    const originalAlpha = context.globalAlpha;
    context.globalAlpha = fillOpacity;
    context.fillStyle = fillColor;
    context.fillRect(x, y, width, height);
    context.globalAlpha = originalAlpha;
  }

  // Draw outline if specified
  if (outlineColor && outlineThickness) {
    context.strokeStyle = outlineColor;
    context.lineWidth = strokeThickness + outlineThickness * 2;
    context.strokeRect(x, y, width, height);
  }

  // Draw the main stroke
  context.strokeStyle = strokeColor;
  context.lineWidth = strokeThickness;
  context.strokeRect(x, y, width, height);
}

/**
 * Draws a cone/sector with stroke and optional fill
 * @param context Canvas 2D context
 * @param x Center X coordinate
 * @param y Center Y coordinate
 * @param radius Cone radius
 * @param startAngle Start angle in radians
 * @param endAngle End angle in radians
 * @param strokeColor Stroke color
 * @param strokeThickness Stroke thickness
 * @param fillColor Optional fill color
 * @param fillOpacity Optional fill opacity (0-1)
 * @param outlineColor Optional outline color
 * @param outlineThickness Optional outline thickness
 */
export function drawCone(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  strokeColor: string,
  strokeThickness: number,
  fillColor?: string,
  fillOpacity?: number,
  outlineColor?: string,
  outlineThickness?: number
): void {
  // Invert angles for canvas coordinate system (Y increases downward)
  const invertedStartAngle = -endAngle;
  const invertedEndAngle = -startAngle;

  // Draw fill if specified
  if (fillColor && fillOpacity !== undefined) {
    const originalAlpha = context.globalAlpha;
    context.globalAlpha = fillOpacity;
    context.fillStyle = fillColor;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, radius, invertedStartAngle, invertedEndAngle);
    context.closePath();
    context.fill();
    context.globalAlpha = originalAlpha;
  }

  // Draw outline if specified
  if (outlineColor && outlineThickness) {
    context.strokeStyle = outlineColor;
    context.lineWidth = strokeThickness + outlineThickness * 2;
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, radius, invertedStartAngle, invertedEndAngle);
    context.closePath();
    context.stroke();
  }

  // Draw the main stroke
  context.strokeStyle = strokeColor;
  context.lineWidth = strokeThickness;
  context.beginPath();
  context.moveTo(x, y);
  context.arc(x, y, radius, invertedStartAngle, invertedEndAngle);
  context.closePath();
  context.stroke();
}

/**
 * Creates a text canvas with consistent styling
 * @param text The text to display
 * @param fontSize Font size in pixels
 * @param color Text color
 * @param outlineColor Outline color
 * @param outlineThickness Outline thickness
 * @param units Optional units text to display in smaller font
 * @returns Canvas element with rendered text
 */
export function createTextCanvas(
  text: string,
  fontSize: number,
  color: string,
  outlineColor: string = '#000000',
  outlineThickness: number = 16,
  units?: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  // Set canvas size
  canvas.width = 256;
  canvas.height = 256;

  // Set composite operation to ensure proper alpha blending
  context.globalCompositeOperation = 'source-over';

  // Clear canvas to fully transparent (alpha = 0)
  context.clearRect(0, 0, canvas.width, canvas.height);

  // Set text properties with semi-bold font
  context.font = `600 ${fontSize}px Inter`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';

  if (units) {
    // Split rendering for number and units
    const unitsFontSize = fontSize * 0.5; // 50% of the main font size

    // Measure both parts with the same font we'll use for drawing
    context.font = `600 ${fontSize}px Inter`;
    const numberWidth = context.measureText(text).width;
    context.font = `600 ${unitsFontSize}px Inter`;
    const unitsWidth = context.measureText(' ' + units).width;
    const totalWidth = numberWidth + unitsWidth;

    // Calculate padding for the background box
    const padding = fontSize * 0.3;
    const boxWidth = totalWidth + padding * 2;
    const boxHeight = fontSize + padding;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = (canvas.height - boxHeight) / 2;

    // Draw background box
    context.fillStyle = color;
    context.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Calculate starting position to center the combined text
    const startX = (canvas.width - totalWidth) / 2;
    // Center the text vertically - the baseline should be at the vertical center plus some offset
    const baselineY = canvas.height / 2 + fontSize * 0.35;

    // Draw number text
    context.font = `600 ${fontSize}px Inter`;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    context.fillStyle = outlineColor;
    context.fillText(text, startX, baselineY);

    // Re-measure the actual rendered width to ensure proper spacing
    const actualNumberWidth = context.measureText(text).width;

    // Draw units text in smaller font, aligned to same baseline
    context.font = `600 ${unitsFontSize}px Inter`;
    context.textBaseline = 'alphabetic';
    context.fillText(' ' + units, startX + actualNumberWidth, baselineY);
  } else {
    // Original behavior for text without units
    // Measure text for box dimensions
    context.font = `600 ${fontSize}px Inter`;
    const textMetrics = context.measureText(text);
    const padding = fontSize * 0.3;
    const boxWidth = textMetrics.width + padding * 2;
    const boxHeight = fontSize + padding;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = (canvas.height - boxHeight) / 2;

    // Draw background box
    context.fillStyle = color;
    context.fillRect(boxX, boxY, boxWidth, boxHeight);

    // Center the text vertically - the baseline should be at the vertical center plus some offset
    const baselineY = canvas.height / 2 + fontSize * 0.35;

    // Draw text on top
    context.textBaseline = 'alphabetic';
    context.fillStyle = outlineColor;
    context.fillText(text, canvas.width / 2, baselineY);
  }

  return canvas;
}
