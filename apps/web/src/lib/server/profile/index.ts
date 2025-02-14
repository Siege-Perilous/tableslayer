import { db } from '$lib/db/app';
import type { PartyRole, SelectGameSession, SelectParty, SelectScene } from '$lib/db/app/schema';
import { filesTable, gameSessionTable, partyMemberTable, partyTable, sceneTable } from '$lib/db/app/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { Thumb } from '../file';
import { transformImage } from '../file';

/* import { getPartyGameSessions } from '../gameSession';
import { getPartiesForUser, getPartyRole } from '../party';
import { getScenes } from '../scene'; */

/* export type UserPartyWithSessions = SelectParty &
  Thumb & {
    partyRole: PartyRole;
    gameSessions: (SelectGameSession & { scenes: SelectScene[] })[];
  }; */

/** Returns an array of parties, each containing its game sessions and scenes */
/* export const getUserPartiesAndSessions = async (userId: string): Promise<UserPartyWithSessions[]> => {
  const parties = await getPartiesForUser(userId);

  return Promise.all(
    parties.map(async (party) => {
      const gameSessions = await getPartyGameSessions(party.id);

      // Fetch scenes for each game session
      const gameSessionsWithScenes = await Promise.all(
        gameSessions.map(async (session) => ({
          ...session,
          scenes: await getScenes(session.id)
        }))
      );

      return {
        ...party,
        gameSessions: gameSessionsWithScenes,
        partyRole: await getPartyRole(userId, party.id)
      };
    })
  );
}; */

export type UserPartyWithSessions = SelectParty &
  Thumb & {
    partyRole: PartyRole;
    gameSessions: Partial<
      SelectGameSession & {
        scenes: Partial<SelectScene & Thumb>[];
      }
    >[];
  };

export const getUserPartiesAndSessions = async (userId: string): Promise<UserPartyWithSessions[]> => {
  // Get all party IDs where the user is a member
  const partyMembers = await db
    .select({ partyId: partyMemberTable.partyId })
    .from(partyMemberTable)
    .where(eq(partyMemberTable.userId, userId))
    .all();

  if (partyMembers.length === 0) {
    return [];
  }

  const partyIds = partyMembers.map((member) => member.partyId);

  // Fetch parties with thumbnails
  const parties = await db
    .select({
      id: partyTable.id,
      name: partyTable.name,
      slug: partyTable.slug,
      avatarLocation: filesTable.location // Get avatar file location
    })
    .from(partyTable)
    .where(inArray(partyTable.id, partyIds))
    .leftJoin(filesTable, eq(partyTable.avatarFileId, filesTable.id)) // Join avatar file
    .orderBy(partyTable.name) // Order parties alphabetically
    .all();

  // Fetch game sessions for the parties
  const gameSessions = await db
    .select({
      id: gameSessionTable.id,
      name: gameSessionTable.name,
      slug: gameSessionTable.slug,
      partyId: gameSessionTable.partyId,
      lastUpdated: gameSessionTable.lastUpdated
    })
    .from(gameSessionTable)
    .where(inArray(gameSessionTable.partyId, partyIds))
    .orderBy(sql`${gameSessionTable.lastUpdated} DESC`) // Order by last updated
    .all();

  // Fetch scenes (up to 5 per session), ordered by scene order
  const sceneRecords = await db
    .select({
      id: sceneTable.id,
      gameSessionId: sceneTable.gameSessionId,
      order: sceneTable.order,
      mapLocation: sceneTable.mapLocation,
      name: sceneTable.name
    })
    .from(sceneTable)
    .where(
      inArray(
        sceneTable.gameSessionId,
        gameSessions.map((s) => s.id)
      )
    )
    .orderBy(sceneTable.gameSessionId, sceneTable.order) // Ensure proper ordering
    .all();

  // ✅ Manually group and limit to 5 scenes per session
  const scenesBySession = new Map<string, (SelectScene & Thumb)[]>();

  for (const scene of sceneRecords) {
    if (!scenesBySession.has(scene.gameSessionId)) {
      scenesBySession.set(scene.gameSessionId, []);
    }

    const sessionScenes = scenesBySession.get(scene.gameSessionId)!;

    if (sessionScenes.length < 5) {
      // ✅ Limit to 5 scenes per session
      const thumb = scene.mapLocation
        ? await transformImage(scene.mapLocation, 'w=400,h=225,fit=cover,gravity=center')
        : null;

      sessionScenes.push({ ...scene, thumb });
    }
  }

  // Transform game sessions into a map (partyId → sessions array)
  const sessionsByParty = new Map<string, (SelectGameSession & { scenes: (SelectScene & Thumb)[] })[]>();

  for (const session of gameSessions) {
    if (!sessionsByParty.has(session.partyId)) {
      sessionsByParty.set(session.partyId, []);
    }

    sessionsByParty.get(session.partyId)!.push({
      ...session,
      scenes: scenesBySession.get(session.id) ?? []
    });
  }

  // Fetch party roles
  const partyRoles = await db
    .select({
      partyId: partyMemberTable.partyId,
      role: partyMemberTable.role
    })
    .from(partyMemberTable)
    .where(and(eq(partyMemberTable.userId, userId), inArray(partyMemberTable.partyId, partyIds)))
    .all();

  const rolesByParty = new Map(partyRoles.map((pr) => [pr.partyId, pr.role]));

  // Map final structured result
  return await Promise.all(
    parties.map(async (party) => {
      let thumb = null;
      if (party.avatarLocation) {
        thumb = await transformImage(party.avatarLocation, 'w=80,h=80,fit=cover,gravity=center');
      }
      return {
        ...party,
        thumb,
        partyRole: rolesByParty.get(party.id) || 'viewer', // Default to viewer if missing
        gameSessions: sessionsByParty.get(party.id) ?? []
      };
    })
  );
};
