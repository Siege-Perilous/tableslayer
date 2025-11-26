export interface RadialMenuItemProps {
  id: string;
  label: string;
  icon?: string;
  color?: string; // Hex color for rendering a color swatch
  submenu?: RadialMenuItemProps[];
  disabled?: boolean;
}

export interface RadialMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  items: RadialMenuItemProps[];
  onItemSelect?: (itemId: string) => void;
  onClose?: () => void;
}
