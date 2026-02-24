export var WeatherType;
(function (WeatherType) {
    WeatherType[WeatherType["None"] = 0] = "None";
    WeatherType[WeatherType["Rain"] = 1] = "Rain";
    WeatherType[WeatherType["Snow"] = 2] = "Snow";
    WeatherType[WeatherType["Leaves"] = 3] = "Leaves";
    WeatherType[WeatherType["Ash"] = 4] = "Ash";
    WeatherType[WeatherType["Custom"] = 99] = "Custom";
})(WeatherType || (WeatherType = {}));
