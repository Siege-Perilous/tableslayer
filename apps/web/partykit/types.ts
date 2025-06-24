// Shared types between PartyKit servers and client

export interface PartyKitCursorData {
  userId: string;
  position: { x: number; y: number };
  normalizedPosition: { x: number; y: number };
  lastMoveTime: number;
}

export interface PartyKitSceneMetadata {
  id: string;
  name: string;
  order: number;
  mapLocation?: string | null;
  mapThumbLocation?: string | null;
  gameSessionId: string;
  thumb?: {
    resizedUrl: string;
    originalUrl?: string;
  };
}

export interface PartyKitPartyState {
  isPaused: boolean;
  activeSceneId?: string;
}
