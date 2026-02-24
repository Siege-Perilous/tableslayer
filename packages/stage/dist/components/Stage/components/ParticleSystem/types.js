import ash from './particles/atlases/ash.png';
import leaves from './particles/atlases/leaves.png';
import rain from './particles/atlases/rain.png';
import snow from './particles/atlases/snow.png';
export var ParticleType;
(function (ParticleType) {
    ParticleType[ParticleType["Snow"] = 1] = "Snow";
    ParticleType[ParticleType["Rain"] = 2] = "Rain";
    ParticleType[ParticleType["Leaves"] = 3] = "Leaves";
    ParticleType[ParticleType["Ash"] = 4] = "Ash";
})(ParticleType || (ParticleType = {}));
export const ParticleData = {
    [ParticleType.Snow]: {
        url: snow,
        size: 768,
        columns: 3,
        rows: 3
    },
    [ParticleType.Rain]: {
        url: rain,
        size: 768,
        columns: 3,
        rows: 3
    },
    [ParticleType.Leaves]: {
        url: leaves,
        size: 768,
        columns: 3,
        rows: 3
    },
    [ParticleType.Ash]: {
        url: ash,
        size: 768,
        columns: 3,
        rows: 3
    }
};
