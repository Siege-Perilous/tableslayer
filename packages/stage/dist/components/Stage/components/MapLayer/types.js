import * as THREE from 'three';
export var MapLayerType;
(function (MapLayerType) {
    MapLayerType[MapLayerType["None"] = 0] = "None";
    MapLayerType[MapLayerType["FogOfWar"] = 1] = "FogOfWar";
    MapLayerType[MapLayerType["Marker"] = 2] = "Marker";
    MapLayerType[MapLayerType["Annotation"] = 3] = "Annotation";
    MapLayerType[MapLayerType["Measurement"] = 4] = "Measurement";
})(MapLayerType || (MapLayerType = {}));
