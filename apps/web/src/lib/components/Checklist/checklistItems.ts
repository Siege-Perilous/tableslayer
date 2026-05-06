import type { Component } from 'svelte';
import {
  AddSceneInstructions,
  ChangeSceneInstructions,
  FogEraseInstructions,
  FogOpacityInstructions,
  FogResetInstructions,
  LaunchPlayfieldInstructions,
  MapDefinedGridInstructions,
  MarkerVisibilityInstructions,
  MeasurementInstructions,
  PanMapInstructions,
  PlaceMarkerInstructions,
  RotateMapInstructions,
  RotateSceneInstructions,
  ScaleMapInstructions,
  SpellEffectInstructions,
  TvSizeInstructions,
  WeatherInstructions
} from './instructions';

export type ChecklistItemId =
  | 'tv-size'
  | 'launch-playfield'
  | 'fog-opacity'
  | 'fog-erase'
  | 'fog-reset'
  | 'weather'
  | 'measurement'
  | 'spell-effect'
  | 'place-marker'
  | 'marker-visibility'
  | 'add-scene'
  | 'scale-map'
  | 'rotate-map'
  | 'rotate-scene'
  | 'change-scene'
  | 'map-defined-grid'
  | 'pan-map';

export type ChecklistItem = {
  id: ChecklistItemId;
  title: string;
  instructions: Component;
};

export const checklistItems: ChecklistItem[] = [
  {
    id: 'tv-size',
    title: 'Set the size of your TV',
    instructions: TvSizeInstructions
  },
  {
    id: 'launch-playfield',
    title: 'Launch the playfield in a new tab',
    instructions: LaunchPlayfieldInstructions
  },
  {
    id: 'fog-opacity',
    title: 'Change the player opacity of the fog of war',
    instructions: FogOpacityInstructions
  },
  {
    id: 'fog-erase',
    title: 'Erase some of the fog of war',
    instructions: FogEraseInstructions
  },
  {
    id: 'fog-reset',
    title: 'Reset the fog of war',
    instructions: FogResetInstructions
  },
  {
    id: 'weather',
    title: 'Change the weather',
    instructions: WeatherInstructions
  },
  {
    id: 'measurement',
    title: 'Measure the distance between two grids',
    instructions: MeasurementInstructions
  },
  {
    id: 'spell-effect',
    title: 'Draw a spell effect on the map',
    instructions: SpellEffectInstructions
  },
  {
    id: 'place-marker',
    title: 'Place a marker in the scene',
    instructions: PlaceMarkerInstructions
  },
  {
    id: 'marker-visibility',
    title: 'Make a marker visible on the playfield',
    instructions: MarkerVisibilityInstructions
  },
  {
    id: 'add-scene',
    title: 'Add a new scene',
    instructions: AddSceneInstructions
  },
  {
    id: 'scale-map',
    title: 'Scale the map',
    instructions: ScaleMapInstructions
  },
  {
    id: 'rotate-map',
    title: 'Rotate the map',
    instructions: RotateMapInstructions
  },
  {
    id: 'rotate-scene',
    title: 'Rotate the scene',
    instructions: RotateSceneInstructions
  },
  {
    id: 'change-scene',
    title: 'Change the active scene',
    instructions: ChangeSceneInstructions
  },
  {
    id: 'map-defined-grid',
    title: 'Use a map with grid dimensions in filename',
    instructions: MapDefinedGridInstructions
  },
  {
    id: 'pan-map',
    title: 'Pan the map with arrow keys',
    instructions: PanMapInstructions
  }
];
