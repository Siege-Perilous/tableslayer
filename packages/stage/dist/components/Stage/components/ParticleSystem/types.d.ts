export declare enum ParticleType {
    Snow = 1,
    Rain = 2,
    Leaves = 3,
    Ash = 4
}
export declare const ParticleData: {
    readonly 1: {
        readonly url: string;
        readonly size: 768;
        readonly columns: 3;
        readonly rows: 3;
    };
    readonly 2: {
        readonly url: string;
        readonly size: 768;
        readonly columns: 3;
        readonly rows: 3;
    };
    readonly 3: {
        readonly url: string;
        readonly size: 768;
        readonly columns: 3;
        readonly rows: 3;
    };
    readonly 4: {
        readonly url: string;
        readonly size: 768;
        readonly columns: 3;
        readonly rows: 3;
    };
};
export interface ParticleSystemProps {
    maxParticleCount: number;
    type: ParticleType;
    lifetime: number;
    color: string;
    opacity: number;
    fadeInTime: number;
    fadeOutTime: number;
    initialVelocity: {
        x: number;
        y: number;
        z: number;
    };
    force: {
        linear: {
            x: number;
            y: number;
            z: number;
        };
        exponential: {
            x: number;
            y: number;
            z: number;
        };
        sinusoidal: {
            amplitude: {
                x: number;
                y: number;
                z: number;
            };
            frequency: {
                x: number;
                y: number;
                z: number;
            };
        };
    };
    rotation: {
        alignRadially: boolean;
        offset: number;
        velocity: number;
        randomize: boolean;
    };
    scale: {
        x: number;
        y: number;
    };
    size: {
        min: number;
        max: number;
    };
    spawnArea: {
        minRadius: number;
        maxRadius: number;
    };
}
