export type SubmenuLayout = 'radial' | 'table';
export type IconComponent = any;
export interface TableFilterOption {
    value: string;
    label: string;
}
export interface RadialMenuItemProps {
    id: string;
    label: string;
    icon?: IconComponent;
    color?: string;
    effectType?: number;
    submenu?: RadialMenuItemProps[];
    submenuLayout?: SubmenuLayout;
    submenuFilterOptions?: TableFilterOption[];
    submenuFilterDefault?: string;
    submenuFilterKey?: string;
    disabled?: boolean;
    [key: string]: unknown;
}
export interface RadialMenuProps {
    visible: boolean;
    position: {
        x: number;
        y: number;
    };
    items: RadialMenuItemProps[];
    backIcon?: IconComponent;
    onItemSelect?: (itemId: string) => void;
    onClose?: () => void;
    onReposition?: (position: {
        x: number;
        y: number;
    }) => void;
}
