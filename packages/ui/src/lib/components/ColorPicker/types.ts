export type RGBA = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type HSVA = {
  h: number;
  s: number;
  v: number;
  a: number;
};

export type HSLA = {
  h: number;
  s: number;
  l: number;
  a: number;
};

export type ColorPickerProps = {
  id?: string;
  hex?: string;
  rgba?: RGBA;
  hsva?: HSVA;
  hsla?: HSLA;
  showAlpha?: boolean;
  showInputs?: boolean;
  showOpacity?: boolean;
  onUpdate?: (payload: ColorUpdatePayload) => void;
};

export type ColorUpdatePayload = {
  hex: string;
  rgba: { r: number; g: number; b: number; a: number };
  hsva: { h: number; s: number; v: number; a: number };
  hsla: { h: number; s: number; l: number; a: number };
};

export type ColorState = {
  hue: number;
  saturation: number;
  value: number;
  opacity: number;
  isSelecting: boolean;
  isAdjustingSV: boolean;
  isAdjustingHue: boolean;
};

export type ColorPickerFormats = 'hex' | 'rgb' | 'hsv' | 'hsl';
