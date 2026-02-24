import * as THREE from 'three';
import { hexDistance, pixelToHex } from '../../../helpers/grid';
import { GridType } from '../../GridLayer/types';
import { SceneLayer, SceneLayerOrder } from '../../Scene/types';
import { MeasurementType } from '../types';
import { createTextCanvas } from '../utils/canvasDrawing';
import { calculateLineDistance } from '../utils/distanceCalculations';
// =============================================================================
// MEASUREMENT CONSTANTS
// =============================================================================
/** Distance in pixels to offset text labels from measurement end points */
const TEXT_OFFSET_DISTANCE = 150;
/** Divisor for calculating font size based on display resolution */
const FONT_SIZE_DIVISOR = 15;
/** Decimal places for distance display */
const DISTANCE_DECIMAL_PLACES = 1;
/**
 * Abstract base class providing common functionality for all measurement types.
 * Handles shared behavior like distance calculation, text rendering, resource management,
 * and coordinate transformations while allowing subclasses to implement specific shapes.
 */
export class BaseMeasurement {
    /**
     * Creates a new measurement instance with the specified properties.
     * Initializes all measurement parameters and sets up the coordinate system.
     *
     * @param {MeasurementType} type - The specific type of measurement being created
     * @param {THREE.Vector2} startPoint - Initial starting point in world coordinates
     * @param {MeasurementLayerProps} measurementProps - Configuration properties for the measurement
     * @param {DisplayProps} displayProps - Display settings including resolution and dimensions
     * @param {GridLayerProps} gridProps - Grid configuration for snapping and units
     */
    constructor(type, startPoint, measurementProps, displayProps, gridProps) {
        /** Scene rotation in degrees for text alignment */
        this.sceneRotation = 0;
        /** Flag indicating whether this measurement has been disposed */
        this.isDisposed = false;
        this.id = crypto.randomUUID();
        this.type = type;
        this.startPoint = startPoint.clone();
        this.endPoint = startPoint.clone();
        this.createdAt = Date.now();
        this.color = measurementProps.color;
        this.opacity = measurementProps.opacity;
        this.thickness = measurementProps.thickness;
        this.markerSize = measurementProps.markerSize;
        this.outlineThickness = measurementProps.outlineThickness;
        this.outlineColor = measurementProps.outlineColor;
        this.showDistance = measurementProps.showDistance;
        this.snapToGrid = measurementProps.snapToGrid;
        this.enableDMG252 = measurementProps.enableDMG252;
        this.displayProps = displayProps;
        this.gridProps = gridProps;
        this.object = new THREE.Group();
        this.object.userData.measurementId = this.id;
        // Create meshes and materials once, only update the texture when the measurement is updated
        const shapeMaterial = new THREE.MeshBasicMaterial({
            map: null,
            transparent: true,
            opacity: this.opacity,
            side: THREE.DoubleSide,
            depthWrite: false,
            depthTest: false,
            toneMapped: false // Prevent tone mapping from making white appear gray
        });
        this.shapeMesh = new THREE.Mesh(undefined, shapeMaterial);
        this.shapeMesh.layers.set(SceneLayer.Overlay);
        this.shapeMesh.renderOrder = SceneLayerOrder.Measurement;
        // Create an empty text mesh that will be updated when measurement has actual distance
        const emptyCanvas = document.createElement('canvas');
        emptyCanvas.width = 1;
        emptyCanvas.height = 1;
        const emptyTexture = new THREE.CanvasTexture(emptyCanvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: emptyTexture,
            transparent: true,
            opacity: this.opacity,
            depthWrite: false,
            depthTest: false,
            toneMapped: false // Prevent tone mapping from making white appear gray
        });
        this.textMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), textMaterial);
        this.textMesh.layers.set(SceneLayer.Overlay);
        this.textMesh.renderOrder = SceneLayerOrder.Measurement;
        this.textMesh.visible = false; // Start invisible until we have actual content
        this.object.add(this.shapeMesh);
        this.object.add(this.textMesh);
    }
    /**
     * Updates the measurement with a new end point and recalculates all derived values.
     * Recreates the shape and text objects to reflect the new measurement geometry.
     * This method is called continuously during measurement creation as the user moves the mouse.
     *
     * @param {THREE.Vector2} endPoint - The new end point coordinates in world space
     * @param {number} sceneRotation - Optional scene rotation in degrees
     * @returns {void}
     */
    update(endPoint, sceneRotation) {
        if (this.isDisposed)
            return;
        this.endPoint = endPoint.clone();
        if (sceneRotation !== undefined) {
            this.sceneRotation = sceneRotation;
        }
        this.renderShape();
        this.renderText();
    }
    /**
     * Renders the distance text label for this measurement with standard positioning logic.
     * Positions text 150 pixels away from the end point in the direction of the measurement.
     * All measurement types share this text positioning and styling approach.
     * Returns an empty group if distance display is disabled.
     *
     * @returns {void}
     */
    renderText() {
        // Calculate direction from start to end point and normalize
        const direction = this.endPoint.clone().sub(this.startPoint).normalize();
        // Initial text position at standard offset distance from the end point
        let textPosition = this.endPoint.clone().add(direction.multiplyScalar(TEXT_OFFSET_DISTANCE));
        // Edge detection and adjustment
        const padding = 150; // Padding from edges to prevent clipping
        const halfWidth = this.displayProps.resolution.x / 2;
        const halfHeight = this.displayProps.resolution.y / 2;
        // Check and adjust for edge clipping
        if (textPosition.x > halfWidth - padding) {
            textPosition.x = halfWidth - padding;
        }
        else if (textPosition.x < -halfWidth + padding) {
            textPosition.x = -halfWidth + padding;
        }
        if (textPosition.y > halfHeight - padding) {
            textPosition.y = halfHeight - padding;
        }
        else if (textPosition.y < -halfHeight + padding) {
            textPosition.y = -halfHeight + padding;
        }
        // For hex grids with snapping, we want to show hex count instead of distance
        const isHexGrid = this.gridProps.gridType === GridType.Hex;
        const showHexCount = isHexGrid && this.snapToGrid;
        let distance;
        let displayText;
        let displayUnits;
        if (showHexCount) {
            // Calculate hex count directly
            const pixelsPerInchX = this.displayProps.resolution.x / this.displayProps.size.x;
            const hexSizePixels = this.gridProps.spacing * pixelsPerInchX;
            const startHex = pixelToHex(this.startPoint, hexSizePixels);
            const endHex = pixelToHex(this.endPoint, hexSizePixels);
            distance = hexDistance(startHex, endHex);
            // Format as integer hex count
            displayText = Math.round(distance).toString();
            displayUnits = distance === 1 ? 'hex' : 'hexes';
        }
        else {
            // Standard distance calculation
            distance = calculateLineDistance(this.startPoint, this.endPoint, this.gridProps.spacing, this.displayProps.size, this.displayProps.resolution, this.gridProps.gridType, this.snapToGrid, this.enableDMG252, this.gridProps.worldGridSize || 5, this.gridProps.worldGridUnits || 'FT');
            // Format number to only show decimals if needed
            displayText = distance % 1 === 0 ? distance.toString() : distance.toFixed(DISTANCE_DECIMAL_PLACES);
            displayUnits = this.gridProps.worldGridUnits || 'FT';
        }
        // Don't render text for zero distance
        if (distance === 0) {
            this.textMesh.visible = false;
            return;
        }
        // Show the text mesh since we have content
        this.textMesh.visible = true;
        const fontSize = this.displayProps.resolution.y / FONT_SIZE_DIVISOR;
        const textCanvas = createTextCanvas(displayText, fontSize, this.color, this.outlineColor, this.outlineThickness, displayUnits);
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(textCanvas);
        texture.needsUpdate = true;
        // Update the text mesh geometry to match canvas size
        if (this.textMesh.geometry) {
            this.textMesh.geometry.dispose();
        }
        this.textMesh.geometry = new THREE.PlaneGeometry(textCanvas.width, textCanvas.height);
        if (this.textMesh.material instanceof THREE.MeshBasicMaterial) {
            // Dispose the old texture before assigning new one to prevent memory leak
            if (this.textMesh.material.map) {
                this.textMesh.material.map.dispose();
            }
            this.textMesh.material.map = texture;
            this.textMesh.material.map.needsUpdate = true;
        }
        this.textMesh.position.set(textPosition.x, textPosition.y, 0);
        // Apply counter-rotation to keep text aligned to browser bottom
        // Similar to how markers handle rotation
        const normalizedRotation = ((this.sceneRotation % 360) + 360) % 360;
        const needsFlip = (normalizedRotation > 85 && normalizedRotation < 95) || (normalizedRotation > 265 && normalizedRotation < 275);
        const counterRotation = needsFlip
            ? -((this.sceneRotation + 180) * Math.PI) / 180
            : -(this.sceneRotation * Math.PI) / 180;
        this.textMesh.rotation.z = counterRotation;
    }
    /**
     * Creates a Three.js mesh displaying text with consistent styling across all measurements.
     * Generates a canvas-based texture with the specified text and applies standard material settings
     * for proper transparency, layering, and visual appearance.
     *
     * @param {string} text - The text content to display
     * @param {THREE.Vector2} position - World coordinates where the text should be positioned
     * @returns {THREE.Mesh} A Three.js mesh containing the rendered text
     */
    createTextMesh(text, position) {
        const fontSize = this.displayProps.resolution.y / FONT_SIZE_DIVISOR;
        const canvas = createTextCanvas(text, fontSize, this.color, this.outlineColor, this.outlineThickness);
        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        // Create plane geometry for text with world dimensions
        const geometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: this.opacity,
            toneMapped: false // Prevent tone mapping from making white appear gray
        });
        const textMesh = new THREE.Mesh(geometry, material);
        textMesh.layers.set(SceneLayer.Overlay);
        textMesh.renderOrder = SceneLayerOrder.Measurement;
        textMesh.position.set(position.x, position.y, 0);
        return textMesh;
    }
    /**
     * Updates the shape mesh with a new geometry and texture.
     * @param {THREE.PlaneGeometry} geometry - The new geometry to use
     * @param {THREE.CanvasTexture} texture - The new texture to use
     * @returns {void}
     */
    updateShapeMesh(geometry, texture) {
        var _a;
        (_a = this.shapeMesh.geometry) === null || _a === void 0 ? void 0 : _a.dispose();
        this.shapeMesh.geometry = geometry;
        if (this.shapeMesh.material instanceof THREE.MeshBasicMaterial) {
            // Dispose the old texture before assigning new one to prevent memory leak
            if (this.shapeMesh.material.map) {
                this.shapeMesh.material.map.dispose();
            }
            this.shapeMesh.material.map = texture;
            this.shapeMesh.material.map.needsUpdate = true;
        }
    }
    /**
     * Completely destroys this measurement instance and cleans up all associated resources.
     * Removes objects from the scene, disposes of Three.js resources, and marks the measurement as disposed.
     * Should be called when the measurement is no longer needed to prevent memory leaks.
     * @returns {void}
     */
    dispose() {
        var _a, _b, _c, _d;
        this.isDisposed = true;
        this.shapeMesh.removeFromParent();
        if (this.shapeMesh instanceof THREE.Mesh) {
            (_a = this.shapeMesh.geometry) === null || _a === void 0 ? void 0 : _a.dispose();
            // Dispose texture before disposing material
            if (this.shapeMesh.material instanceof THREE.MeshBasicMaterial && this.shapeMesh.material.map) {
                this.shapeMesh.material.map.dispose();
            }
            (_b = this.shapeMesh.material) === null || _b === void 0 ? void 0 : _b.dispose();
        }
        this.textMesh.removeFromParent();
        if (this.textMesh instanceof THREE.Mesh) {
            (_c = this.textMesh.geometry) === null || _c === void 0 ? void 0 : _c.dispose();
            // Dispose texture before disposing material
            if (this.textMesh.material instanceof THREE.MeshBasicMaterial && this.textMesh.material.map) {
                this.textMesh.material.map.dispose();
            }
            (_d = this.textMesh.material) === null || _d === void 0 ? void 0 : _d.dispose();
        }
        this.object.removeFromParent();
    }
}
