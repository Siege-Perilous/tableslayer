/**
 * Visual effect types for annotation layers
 */
export var AnnotationEffect;
(function (AnnotationEffect) {
    AnnotationEffect[AnnotationEffect["None"] = 0] = "None";
    AnnotationEffect[AnnotationEffect["Fire"] = 1] = "Fire";
    AnnotationEffect[AnnotationEffect["SpaceTear"] = 2] = "SpaceTear";
    AnnotationEffect[AnnotationEffect["Water"] = 3] = "Water";
    AnnotationEffect[AnnotationEffect["Magic"] = 4] = "Magic";
    AnnotationEffect[AnnotationEffect["Grease"] = 5] = "Grease";
    AnnotationEffect[AnnotationEffect["Ice"] = 6] = "Ice";
})(AnnotationEffect || (AnnotationEffect = {}));
/**
 * Default effect properties for each annotation effect type
 */
export const AnnotationEffectDefaults = {
    [AnnotationEffect.None]: {
        speed: 1.0,
        intensity: 1.0,
        softness: 0.5,
        border: 0.5,
        roughness: 0.0
    },
    [AnnotationEffect.Fire]: {
        speed: 0.94,
        intensity: 1.04,
        softness: 0.37,
        border: 0.4,
        roughness: 0.62
    },
    [AnnotationEffect.SpaceTear]: {
        speed: 1.5,
        intensity: 1.96,
        softness: 0.35,
        border: 0.36,
        roughness: 0.34
    },
    [AnnotationEffect.Water]: {
        speed: 0.42,
        intensity: 1.06,
        softness: 0.0,
        border: 0.36,
        roughness: 0.32
    },
    [AnnotationEffect.Magic]: {
        speed: 0.5,
        intensity: 0.98,
        softness: 0.24,
        border: 0.18,
        roughness: 0.5
    },
    [AnnotationEffect.Grease]: {
        speed: 0.26,
        intensity: 1.52,
        softness: 0.13,
        border: 0.57,
        roughness: 0.26
    },
    [AnnotationEffect.Ice]: {
        speed: 0.92,
        intensity: 1.2,
        softness: 0.32,
        border: 0.44,
        roughness: 0.55
    }
};
/**
 * Get the default effect properties for a given effect type
 */
export const getDefaultEffectProps = (effectType) => (Object.assign({ type: effectType }, AnnotationEffectDefaults[effectType]));
