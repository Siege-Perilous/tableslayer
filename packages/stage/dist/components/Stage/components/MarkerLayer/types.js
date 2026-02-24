export var MarkerVisibility;
(function (MarkerVisibility) {
    MarkerVisibility[MarkerVisibility["Always"] = 0] = "Always";
    MarkerVisibility[MarkerVisibility["DM"] = 1] = "DM";
    MarkerVisibility[MarkerVisibility["Player"] = 2] = "Player";
    MarkerVisibility[MarkerVisibility["Hover"] = 3] = "Hover"; // Hidden from players, revealed on DM hover
})(MarkerVisibility || (MarkerVisibility = {}));
export var MarkerShape;
(function (MarkerShape) {
    MarkerShape[MarkerShape["None"] = 0] = "None";
    MarkerShape[MarkerShape["Circle"] = 1] = "Circle";
    MarkerShape[MarkerShape["Square"] = 2] = "Square";
    MarkerShape[MarkerShape["Triangle"] = 3] = "Triangle";
    MarkerShape[MarkerShape["Pin"] = 4] = "Pin";
})(MarkerShape || (MarkerShape = {}));
export var MarkerSize;
(function (MarkerSize) {
    MarkerSize[MarkerSize["Small"] = 1] = "Small";
    MarkerSize[MarkerSize["Medium"] = 2] = "Medium";
    MarkerSize[MarkerSize["Large"] = 3] = "Large";
})(MarkerSize || (MarkerSize = {}));
