export interface HoveredMarker {
  id: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  tooltip: {
    title: string;
    content: string; // Rich text HTML from TipTap
    imageUrl?: string;
  };
}

export interface MarkerAwarenessState {
  hoveredMarker?: HoveredMarker;
}
