import { extractLocationFromUrl } from '$lib/server';
import { updateScene } from '$lib/server/scene';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { type StageProps } from '@tableslayer/ui';

// Utility function to set properties if they exist
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setIfExists(source: Record<string, any>, target: Record<string, any>, map: Record<string, string>) {
  for (const [sourceKey, targetKey] of Object.entries(map)) {
    if (source[sourceKey] !== undefined) {
      target[targetKey] = source[sourceKey];
    }
  }
}

// Utility function for nested properties
function setNestedIfExists(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: Record<string, any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  target: Record<string, any>,
  parentKey: string,
  map: Record<string, string>
) {
  if (!source[parentKey]) return;
  for (const [sourceKey, targetKey] of Object.entries(map)) {
    if (source[parentKey][sourceKey] !== undefined) {
      target[targetKey] = source[parentKey][sourceKey];
    }
  }
}

// Converts partial `StageProps` to `sceneTable` fields
const convertPropsToSceneDetails = (stageProps: Partial<StageProps>): Partial<Record<string, unknown>> => {
  const details: Partial<Record<string, unknown>> = {};

  // Direct mapping
  setIfExists(stageProps, details, {
    backgroundColor: 'backgroundColor'
  });

  // Nested mappings
  setNestedIfExists(stageProps, details, 'display', {
    'padding.x': 'displayPaddingX',
    'padding.y': 'displayPaddingY',
    'size.x': 'displaySizeX',
    'size.y': 'displaySizeY',
    'resolution.x': 'displayResolutionX',
    'resolution.y': 'displayResolutionY'
  });

  setNestedIfExists(stageProps, details, 'fogOfWar', {
    data: 'fogOfWarData',
    fogColor: 'fogOfWarColor',
    opacity: 'fogOfWarOpacity'
  });

  setNestedIfExists(stageProps, details, 'grid', {
    gridType: 'gridType',
    spacing: 'gridSpacing',
    opacity: 'gridOpacity',
    lineColor: 'gridLineColor',
    lineThickness: 'gridLineThickness',
    shadowColor: 'gridShadowColor',
    shadowOpacity: 'gridShadowOpacity',
    shadowBlur: 'gridShadowBlur',
    shadowSpread: 'gridShadowSpread'
  });

  setNestedIfExists(stageProps, details, 'map', {
    rotation: 'mapRotation',
    'offset.x': 'mapOffsetX',
    'offset.y': 'mapOffsetY',
    zoom: 'mapZoom'
  });

  // Extract map location from URL stored in state
  if (stageProps.map?.url) {
    const extractedLocation = extractLocationFromUrl(stageProps.map.url);
    if (extractedLocation) {
      details.mapLocation = extractedLocation;
    }
  }

  setNestedIfExists(stageProps, details, 'scene', {
    'offset.x': 'sceneOffsetX',
    'offset.y': 'sceneOffsetY'
  });

  return details;
};

// API Route handler
export const POST: RequestHandler = async ({ request, params, locals }) => {
  try {
    const { sceneId } = params;
    const body = await request.json();
    const { stageProps, dbName } = body as { stageProps: Partial<StageProps>; dbName: string };

    if (!dbName || !sceneId || !stageProps) {
      throw error(400, 'Invalid request data');
    }

    const userId = locals.user.id as string;
    const sceneDetails = convertPropsToSceneDetails(stageProps);

    await updateScene(dbName, userId, sceneId, sceneDetails);

    return json({ success: true });
  } catch (err) {
    console.error(err);
    return error(500, 'Internal server error');
  }
};
