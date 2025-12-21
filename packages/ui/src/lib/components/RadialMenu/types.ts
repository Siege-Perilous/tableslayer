export type SubmenuLayout = 'radial' | 'table';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = any;

export interface TableFilterOption {
  value: string;
  label: string;
}

export interface RadialMenuItemProps {
  id: string;
  label: string;
  icon?: IconComponent;
  color?: string; // Hex color for rendering a color swatch
  submenu?: RadialMenuItemProps[];
  submenuLayout?: SubmenuLayout; // 'radial' (default) or 'table' for column-based layout
  submenuFilterOptions?: TableFilterOption[]; // Filter options for table layout (e.g., game sessions)
  submenuFilterDefault?: string; // Default selected filter value
  submenuFilterKey?: string; // Key on submenu items to match against filter value
  disabled?: boolean;
  // Allow additional properties for filtering (e.g., gameSessionId)
  [key: string]: unknown;
}

export interface RadialMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  items: RadialMenuItemProps[];
  backIcon?: IconComponent;
  onItemSelect?: (itemId: string) => void;
  onClose?: () => void;
  onReposition?: (position: { x: number; y: number }) => void;
}
