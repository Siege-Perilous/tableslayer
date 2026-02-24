import * as THREE from 'three';
import type { GridLayerProps } from '../../GridLayer/types';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
/**
 * Interface defining the contract that all measurement implementations must follow.
 * Provides methods for lifecycle management, rendering, and data access for measurements.
 */
export interface IMeasurement {
    /** The Three.js group object containing the measurement visualization */
    object: THREE.Group;
    /** The rendered shape object in the Three.js scene */
    shapeMesh: THREE.Mesh;
    /** The rendered text object in the Three.js scene */
    textMesh: THREE.Mesh;
    /** Starting point of the measurement in world coordinates */
    startPoint: THREE.Vector2;
    /** Current end point of the measurement in world coordinates */
    endPoint: THREE.Vector2;
    /**
     * Updates the measurement with a new end point, typically called during mouse movement.
     * @param {THREE.Vector2} endPoint - The new end point coordinates in world space
     * @param {number} sceneRotation - Optional scene rotation in degrees
     * @returns {void}
     */
    update(endPoint: THREE.Vector2, sceneRotation?: number): void;
    /**
     * Renders only the shape portion of the measurement (without text labels).
     * @returns {void}
     */
    renderShape(): void;
    /**
     * Cleans up all Three.js resources and removes the measurement from memory.
     * Should be called when the measurement is no longer needed.
     * @returns {void}
     */
    dispose(): void;
}
/**
 * Abstract base class providing common functionality for all measurement types.
 * Handles shared behavior like distance calculation, text rendering, resource management,
 * and coordinate transformations while allowing subclasses to implement specific shapes.
 */
export declare abstract class BaseMeasurement implements IMeasurement {
    /** Unique identifier for this measurement instance */
    id: string;
    /** The type of measurement (line, circle, rectangle, etc.) */
    type: MeasurementType;
    /** Starting point of the measurement in world coordinates */
    startPoint: THREE.Vector2;
    /** Current end point of the measurement in world coordinates */
    endPoint: THREE.Vector2;
    /** Timestamp when the measurement was created */
    createdAt: number;
    /** Primary color for the measurement visualization */
    color: string;
    /** Opacity level for the measurement (0.0 to 1.0) */
    opacity: number;
    /** Line thickness for drawing measurement elements */
    thickness: number;
    /** Diameter of the measurement markers/points */
    markerSize: number;
    /** Thickness of outline strokes around measurement elements */
    outlineThickness: number;
    /** Color used for outline strokes */
    outlineColor: string;
    /** Whether to display distance text labels */
    showDistance: boolean;
    /** Whether to snap measurement points to the grid */
    snapToGrid: boolean;
    /** Whether to use DMG 252 measurement calculations */
    enableDMG252: boolean;
    /** Display properties containing resolution and size information */
    protected displayProps: DisplayProps;
    /** Grid properties containing spacing and units information */
    protected gridProps: GridLayerProps;
    /** Scene rotation in degrees for text alignment */
    protected sceneRotation: number;
    /** The group object in the Three.js scene */
    object: THREE.Group;
    /** The rendered shape object in the Three.js scene */
    shapeMesh: THREE.Mesh;
    /** The rendered text object in the Three.js scene */
    textMesh: THREE.Mesh;
    /** Flag indicating whether this measurement has been disposed */
    protected isDisposed: boolean;
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
    constructor(type: MeasurementType, startPoint: THREE.Vector2, measurementProps: MeasurementLayerProps, displayProps: DisplayProps, gridProps: GridLayerProps);
    /**
     * Updates the measurement with a new end point and recalculates all derived values.
     * Recreates the shape and text objects to reflect the new measurement geometry.
     * This method is called continuously during measurement creation as the user moves the mouse.
     *
     * @param {THREE.Vector2} endPoint - The new end point coordinates in world space
     * @param {number} sceneRotation - Optional scene rotation in degrees
     * @returns {void}
     */
    update(endPoint: THREE.Vector2, sceneRotation?: number): void;
    /**
     * Renders the distance text label for this measurement with standard positioning logic.
     * Positions text 150 pixels away from the end point in the direction of the measurement.
     * All measurement types share this text positioning and styling approach.
     * Returns an empty group if distance display is disabled.
     *
     * @returns {void}
     */
    renderText(): void;
    /**
     * Abstract method that must be implemented by each measurement type to render its specific shape.
     * Should create and return a Three.js object representing the measurement's visual geometry
     * (line, circle, rectangle, etc.) based on the current start and end points.
     * The mesh should be stored in the `this.mesh` property.
     *
     * @returns {void}
     */
    abstract renderShape(): void;
    /**
     * Creates a Three.js mesh displaying text with consistent styling across all measurements.
     * Generates a canvas-based texture with the specified text and applies standard material settings
     * for proper transparency, layering, and visual appearance.
     *
     * @param {string} text - The text content to display
     * @param {THREE.Vector2} position - World coordinates where the text should be positioned
     * @returns {THREE.Mesh} A Three.js mesh containing the rendered text
     */
    protected createTextMesh(text: string, position: THREE.Vector2): THREE.Mesh;
    /**
     * Updates the shape mesh with a new geometry and texture.
     * @param {THREE.PlaneGeometry} geometry - The new geometry to use
     * @param {THREE.CanvasTexture} texture - The new texture to use
     * @returns {void}
     */
    protected updateShapeMesh(geometry: THREE.PlaneGeometry, texture: THREE.CanvasTexture): void;
    /**
     * Completely destroys this measurement instance and cleans up all associated resources.
     * Removes objects from the scene, disposes of Three.js resources, and marks the measurement as disposed.
     * Should be called when the measurement is no longer needed to prevent memory leaks.
     * @returns {void}
     */
    dispose(): void;
}
