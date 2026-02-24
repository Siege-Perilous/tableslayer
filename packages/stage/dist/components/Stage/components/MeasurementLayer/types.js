import * as THREE from 'three';
export var MeasurementType;
(function (MeasurementType) {
    MeasurementType[MeasurementType["Line"] = 1] = "Line";
    MeasurementType[MeasurementType["Beam"] = 2] = "Beam";
    MeasurementType[MeasurementType["Cone"] = 3] = "Cone";
    MeasurementType[MeasurementType["Circle"] = 4] = "Circle";
    MeasurementType[MeasurementType["Square"] = 5] = "Square";
})(MeasurementType || (MeasurementType = {}));
