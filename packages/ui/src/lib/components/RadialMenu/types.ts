export interface RadialMenuItem {
  id: string;
  label: string;
  icon?: string;
  color?: string; // Hex color for rendering a color swatch
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
