export var GridType;
(function (GridType) {
    GridType[GridType["Square"] = 0] = "Square";
    GridType[GridType["Hex"] = 1] = "Hex";
})(GridType || (GridType = {}));
export var GridMode;
(function (GridMode) {
    GridMode[GridMode["FillSpace"] = 0] = "FillSpace";
    GridMode[GridMode["MapDefined"] = 1] = "MapDefined";
})(GridMode || (GridMode = {}));
