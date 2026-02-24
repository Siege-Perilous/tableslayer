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
export declare function drawLine(context: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number, color: string, thickness: number, outlineColor?: string, outlineThickness?: number): void;
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
export declare function drawCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, outlineColor?: string, outlineThickness?: number): void;
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
export declare function drawLargeCircle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, strokeColor: string, strokeThickness: number, fillColor?: string, fillOpacity?: number, outlineColor?: string, outlineThickness?: number): void;
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
export declare function drawRectangle(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, strokeColor: string, strokeThickness: number, fillColor?: string, fillOpacity?: number, outlineColor?: string, outlineThickness?: number): void;
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
export declare function drawCone(context: CanvasRenderingContext2D, x: number, y: number, radius: number, startAngle: number, endAngle: number, strokeColor: string, strokeThickness: number, fillColor?: string, fillOpacity?: number, outlineColor?: string, outlineThickness?: number): void;
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
export declare function createTextCanvas(text: string, fontSize: number, color: string, outlineColor?: string, _outlineThickness?: number, units?: string): HTMLCanvasElement;
