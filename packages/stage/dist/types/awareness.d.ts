export interface HoveredMarker {
    id: string;
    position: {
        x: number;
        y: number;
        z: number;
    };
    tooltip: {
        title: string;
        content: string;
        imageUrl?: string;
    };
}
export interface MarkerAwarenessState {
    hoveredMarker?: HoveredMarker;
}
