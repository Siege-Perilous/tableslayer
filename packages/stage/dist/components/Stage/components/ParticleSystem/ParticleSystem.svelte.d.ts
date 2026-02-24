import type { ParticleSystemProps } from './types';
interface Props {
    props: ParticleSystemProps;
    opacity?: number;
    intensity?: number;
}
declare const ParticleSystem: import("svelte").Component<Props, {}, "">;
type ParticleSystem = ReturnType<typeof ParticleSystem>;
export default ParticleSystem;
