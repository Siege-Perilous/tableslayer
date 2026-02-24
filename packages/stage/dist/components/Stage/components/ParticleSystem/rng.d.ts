export class RNG {
    constructor(seed: any);
    m_w: number;
    m_z: number;
    mask: number;
    random(): number;
}
