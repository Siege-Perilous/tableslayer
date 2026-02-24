export var SceneLoadingState;
(function (SceneLoadingState) {
    SceneLoadingState[SceneLoadingState["LoadingMap"] = 1] = "LoadingMap";
    SceneLoadingState[SceneLoadingState["Resizing"] = 2] = "Resizing";
    SceneLoadingState[SceneLoadingState["Rendering"] = 3] = "Rendering";
    SceneLoadingState[SceneLoadingState["Initialized"] = 4] = "Initialized";
})(SceneLoadingState || (SceneLoadingState = {}));
export var SceneRotation;
(function (SceneRotation) {
    SceneRotation[SceneRotation["Deg0"] = 0] = "Deg0";
    SceneRotation[SceneRotation["Deg90"] = 90] = "Deg90";
    SceneRotation[SceneRotation["Deg180"] = 180] = "Deg180";
    SceneRotation[SceneRotation["Deg270"] = 270] = "Deg270";
})(SceneRotation || (SceneRotation = {}));
export var SceneLayer;
(function (SceneLayer) {
    SceneLayer[SceneLayer["Main"] = 0] = "Main";
    SceneLayer[SceneLayer["Overlay"] = 1] = "Overlay";
    SceneLayer[SceneLayer["Input"] = 2] = "Input";
})(SceneLayer || (SceneLayer = {}));
export var SceneLayerOrder;
(function (SceneLayerOrder) {
    SceneLayerOrder[SceneLayerOrder["Background"] = 0] = "Background";
    SceneLayerOrder[SceneLayerOrder["Map"] = 10] = "Map";
    SceneLayerOrder[SceneLayerOrder["Fog"] = 20] = "Fog";
    SceneLayerOrder[SceneLayerOrder["Weather"] = 30] = "Weather";
    SceneLayerOrder[SceneLayerOrder["EffectAnnotation"] = 35] = "EffectAnnotation";
    SceneLayerOrder[SceneLayerOrder["Marker"] = 37] = "Marker";
    SceneLayerOrder[SceneLayerOrder["FogOfWar"] = 40] = "FogOfWar";
    SceneLayerOrder[SceneLayerOrder["Grid"] = 50] = "Grid";
    SceneLayerOrder[SceneLayerOrder["EdgeOverlay"] = 70] = "EdgeOverlay";
    SceneLayerOrder[SceneLayerOrder["Annotation"] = 80] = "Annotation";
    SceneLayerOrder[SceneLayerOrder["Measurement"] = 90] = "Measurement";
    SceneLayerOrder[SceneLayerOrder["Cursor"] = 100] = "Cursor";
})(SceneLayerOrder || (SceneLayerOrder = {}));
