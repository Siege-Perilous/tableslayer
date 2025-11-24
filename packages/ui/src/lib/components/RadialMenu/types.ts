export interface RadialMenuItem {
  id: string;
  label: string;
  icon?: string;
  submenu?: RadialMenuItem[];
  disabled?: boolean;
}

export interface RadialMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  items: RadialMenuItem[];
  onItemSelect?: (itemId: string) => void;
  onClose?: () => void;
}
