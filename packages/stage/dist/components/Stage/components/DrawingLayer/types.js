export var InitialState;
(function (InitialState) {
    InitialState[InitialState["Clear"] = 0] = "Clear";
    InitialState[InitialState["Fill"] = 1] = "Fill";
})(InitialState || (InitialState = {}));
export var ToolType;
(function (ToolType) {
    ToolType[ToolType["Brush"] = 1] = "Brush";
    ToolType[ToolType["Rectangle"] = 2] = "Rectangle";
    ToolType[ToolType["Ellipse"] = 3] = "Ellipse";
})(ToolType || (ToolType = {}));
export var DrawMode;
(function (DrawMode) {
    DrawMode[DrawMode["Erase"] = 0] = "Erase";
    DrawMode[DrawMode["Draw"] = 1] = "Draw";
})(DrawMode || (DrawMode = {}));
export var RenderMode;
(function (RenderMode) {
    RenderMode["Draw"] = "draw";
    RenderMode["Clear"] = "clear";
    RenderMode["Revert"] = "revert";
    RenderMode["Fill"] = "fill";
})(RenderMode || (RenderMode = {}));
