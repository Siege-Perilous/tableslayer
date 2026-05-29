import { db, getDatabaseMode } from '$lib/db/app';
import { gameSessionTable, partyMemberTable, partyTable, sceneTable } from '$lib/db/app/schema';
import { getAnnotationMasksForScene, getAnnotationsForScene } from '$lib/server/annotations';
import { transformImage } from '$lib/server/file/transform';
import { getLightsForScene } from '$lib/server/light';
import { getMarkersForScene } from '$lib/server/marker';
import { getScene, getSceneMaskData, getScenes } from '$lib/server/scene';
import { count, desc, eq, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export type DiagnosticResult = {
  name: string;
  description: string;
  duration: number;
  status: 'success' | 'error' | 'warning';
  details?: string;
};

export type SessionOption = {
  id: string;
  name: string;
  partyName: string;
  sceneCount: number;
};

export type DiagnosticsData = {
  results: DiagnosticResult[];
  timestamp: string;
  region: string;
  databaseMode: string;
  selectedSession?: SessionOption;
  testImagePath?: string;
  testImageUrl?: string;
};

const timeAsync = async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};

export const load: PageServerLoad = async ({ parent, params }) => {
  const { user } = await parent();
  const results: DiagnosticResult[] = [];
  const partykitHost = process.env.PUBLIC_PARTYKIT_HOST || 'localhost:1999';

  // Get selected session from route params
  const selectedSessionId = params.sessionId || null;

  // Find user's parties
  const { result: partyIds, duration: partyQueryTime } = await timeAsync(async () => {
    const members = await db
      .select({ partyId: partyMemberTable.partyId })
      .from(partyMemberTable)
      .where(eq(partyMemberTable.userId, user.id))
      .all();
    return members.map((m) => m.partyId);
  });

  results.push({
    name: 'DB: User parties query',
    description: 'Query user party memberships',
    duration: Math.round(partyQueryTime),
    status: partyQueryTime < 100 ? 'success' : partyQueryTime < 500 ? 'warning' : 'error',
    details: `Found ${partyIds.length} parties`
  });

  // Get all sessions with scene counts for the dropdown
  let allSessions: SessionOption[] = [];
  let selectedSession: SessionOption | undefined = undefined;
  let testMapLocation: string | null = null;

  if (partyIds.length > 0) {
    // Get all sessions with their party names and scene counts
    const sessionsWithCounts = await db
      .select({
        sessionId: gameSessionTable.id,
        sessionName: gameSessionTable.name,
        partyId: gameSessionTable.partyId,
        partyName: partyTable.name,
        sceneCount: count(sceneTable.id)
      })
      .from(gameSessionTable)
      .innerJoin(partyTable, eq(partyTable.id, gameSessionTable.partyId))
      .leftJoin(sceneTable, eq(sceneTable.gameSessionId, gameSessionTable.id))
      .where(inArray(gameSessionTable.partyId, partyIds))
      .groupBy(gameSessionTable.id, partyTable.name)
      .orderBy(desc(count(sceneTable.id)))
      .all();

    allSessions = sessionsWithCounts.map((s) => ({
      id: s.sessionId,
      name: s.sessionName,
      partyName: s.partyName,
      sceneCount: s.sceneCount
    }));

    // Find the session to test - either selected or the largest
    const sessionToTest = selectedSessionId
      ? sessionsWithCounts.find((s) => s.sessionId === selectedSessionId)
      : sessionsWithCounts[0];

    if (sessionToTest && sessionToTest.sceneCount > 0) {
      selectedSession = {
        id: sessionToTest.sessionId,
        name: sessionToTest.sessionName,
        partyName: sessionToTest.partyName,
        sceneCount: sessionToTest.sceneCount
      };

      // Pure DB query - no R2/CDN transforms
      const { result: scenesRaw, duration: rawDbTime } = await timeAsync(async () => {
        return await db
          .select({
            id: sceneTable.id,
            name: sceneTable.name,
            mapLocation: sceneTable.mapLocation
          })
          .from(sceneTable)
          .where(eq(sceneTable.gameSessionId, sessionToTest.sessionId))
          .all();
      });

      results.push({
        name: 'DB: Raw scenes query',
        description: 'Pure DB query, no R2/CDN',
        duration: Math.round(rawDbTime),
        status: rawDbTime < 50 ? 'success' : rawDbTime < 200 ? 'warning' : 'error',
        details: `Fetched ${scenesRaw.length} scenes`
      });

      // Load all scenes for the session (this mirrors what the editor does)
      const { result: scenes, duration: loadScenesTime } = await timeAsync(async () => {
        return await getScenes(sessionToTest.sessionId);
      });

      results.push({
        name: 'DB: Load all scenes',
        description: 'Load scenes list with thumbnails',
        duration: Math.round(loadScenesTime),
        status: loadScenesTime < 500 ? 'success' : loadScenesTime < 2000 ? 'warning' : 'error',
        details: `Loaded ${scenes.length} scenes with thumbnails`
      });

      // Get the first scene for detailed tests
      if (scenes.length > 0) {
        const firstScene = scenes[0];
        testMapLocation = firstScene.mapLocation;

        // Load full scene data (editor calls this separately from getScenes)
        const { result: fullScene, duration: fullSceneTime } = await timeAsync(async () => {
          return await getScene(firstScene.id);
        });

        results.push({
          name: 'DB: Load full scene',
          description: 'Load single scene with all data',
          duration: Math.round(fullSceneTime),
          status: fullSceneTime < 100 ? 'success' : fullSceneTime < 500 ? 'warning' : 'error',
          details: fullScene ? `Scene: ${fullScene.name}` : 'Scene not found'
        });

        // Load markers for the scene
        const { result: markers, duration: markersTime } = await timeAsync(async () => {
          return await getMarkersForScene(firstScene.id);
        });

        results.push({
          name: 'DB: Load markers',
          description: 'Load markers with image transforms',
          duration: Math.round(markersTime),
          status: markersTime < 300 ? 'success' : markersTime < 1000 ? 'warning' : 'error',
          details: `Loaded ${markers.length} markers`
        });

        // Load lights for the scene
        const { result: lights, duration: lightsTime } = await timeAsync(async () => {
          return await getLightsForScene(firstScene.id);
        });

        results.push({
          name: 'DB: Load lights',
          description: 'Load lights for scene',
          duration: Math.round(lightsTime),
          status: lightsTime < 100 ? 'success' : lightsTime < 500 ? 'warning' : 'error',
          details: `Loaded ${lights.length} lights`
        });

        // Load annotations for the scene
        const { result: annotations, duration: annotationsTime } = await timeAsync(async () => {
          return await getAnnotationsForScene(firstScene.id);
        });

        results.push({
          name: 'DB: Load annotations',
          description: 'Load annotations for scene',
          duration: Math.round(annotationsTime),
          status: annotationsTime < 100 ? 'success' : annotationsTime < 500 ? 'warning' : 'error',
          details: `Loaded ${annotations.length} annotations`
        });

        // Load fog mask (the heavy blob data)
        const { result: fogMask, duration: fogMaskTime } = await timeAsync(async () => {
          try {
            return await getSceneMaskData(firstScene.id);
          } catch {
            return { fogOfWarMask: null };
          }
        });

        results.push({
          name: 'DB: Load fog mask',
          description: 'Load fog of war mask (RLE blob)',
          duration: Math.round(fogMaskTime),
          status: fogMaskTime < 200 ? 'success' : fogMaskTime < 1000 ? 'warning' : 'error',
          details: fogMask.fogOfWarMask ? `Mask size: ${fogMask.fogOfWarMask.length} chars` : 'No mask data'
        });

        // Load annotation masks (editor fetches these in parallel)
        const { result: annotationMasks, duration: annotationMasksTime } = await timeAsync(async () => {
          return await getAnnotationMasksForScene(firstScene.id);
        });

        results.push({
          name: 'DB: Load annotation masks',
          description: 'Load annotation mask blobs',
          duration: Math.round(annotationMasksTime),
          status: annotationMasksTime < 200 ? 'success' : annotationMasksTime < 1000 ? 'warning' : 'error',
          details: `Loaded ${Object.keys(annotationMasks).length} annotation masks`
        });
      }
    }
  }

  // R2 Image resize tests
  // Use a test image or the scene map if available
  const testImage = testMapLocation || 'map/example1080.png';

  // Thumbnail resize (400x225)
  try {
    const { result: thumbResult, duration: thumbTime } = await timeAsync(async () => {
      return await transformImage(testImage, 'w=400,h=225,fit=cover,gravity=center');
    });

    results.push({
      name: 'R2: Thumbnail resize',
      description: 'Resize image to 400x225 via CDN',
      duration: Math.round(thumbTime),
      status: thumbTime < 300 ? 'success' : thumbTime < 1000 ? 'warning' : 'error',
      details: thumbResult.details ? `${thumbResult.details.width}x${thumbResult.details.height}` : 'Resize completed'
    });
  } catch (error) {
    results.push({
      name: 'R2: Thumbnail resize',
      description: 'Resize image to 400x225 via CDN',
      duration: 0,
      status: 'error',
      details: error instanceof Error ? error.message : 'Failed to resize'
    });
  }

  // Large image resize (3000x3000)
  try {
    const { result: largeResult, duration: largeTime } = await timeAsync(async () => {
      return await transformImage(testImage, 'w=3000,h=3000,fit=scale-down,gravity=center');
    });

    results.push({
      name: 'R2: Large image resize',
      description: 'Resize image to 3000x3000 via CDN',
      duration: Math.round(largeTime),
      status: largeTime < 500 ? 'success' : largeTime < 2000 ? 'warning' : 'error',
      details: largeResult.details
        ? `${largeResult.details.original.width}x${largeResult.details.original.height} → ${largeResult.details.width}x${largeResult.details.height}`
        : 'Resize completed'
    });
  } catch (error) {
    results.push({
      name: 'R2: Large image resize',
      description: 'Resize image to 3000x3000 via CDN',
      duration: 0,
      status: 'error',
      details: error instanceof Error ? error.message : 'Failed to resize'
    });
  }

  // PartyKit round-trip test - uses a test room to measure actual message latency
  const testRoomId = selectedSession?.id || 'diagnostics-test';
  try {
    const partykitUrl = partykitHost.includes('localhost') ? `http://${partykitHost}` : `https://${partykitHost}`;

    const { result: pingResult, duration: partykitTime } = await timeAsync(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(`${partykitUrl}/parties/game_session/${testRoomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'ping', timestamp: Date.now() }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    });

    results.push({
      name: 'PartyKit: Round-trip',
      description: 'HTTP POST to PartyKit room with response',
      duration: Math.round(partykitTime),
      status: partykitTime < 200 ? 'success' : partykitTime < 500 ? 'warning' : 'error',
      details: `Room: ${pingResult.roomId || testRoomId}`
    });
  } catch (error) {
    results.push({
      name: 'PartyKit: Round-trip',
      description: 'HTTP POST to PartyKit room with response',
      duration: 0,
      status: 'error',
      details: error instanceof Error ? error.message : 'Connection failed'
    });
  }

  const bucketUrl = process.env.CLOUDFLARE_R2_BUCKET_URL || 'https://files.tableslayer.com';

  const diagnosticsData: DiagnosticsData = {
    results,
    timestamp: new Date().toISOString(),
    region: process.env.FLY_REGION || 'local',
    databaseMode: getDatabaseMode(),
    selectedSession,
    testImagePath: testImage,
    testImageUrl: `${bucketUrl}/${testImage}`
  };

  return {
    diagnostics: diagnosticsData,
    sessions: allSessions
  };
};
