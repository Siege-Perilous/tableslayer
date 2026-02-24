import type { RadialMenuItemProps } from './types';
interface Props {
    item: RadialMenuItemProps;
    angle: number;
    radius: number;
    counterRotation: number;
    onSelect: (itemId: string) => void;
}
declare const RadialMenuItem: import("svelte").Component<Props, {}, "">;
type RadialMenuItem = ReturnType<typeof RadialMenuItem>;
export default RadialMenuItem;
