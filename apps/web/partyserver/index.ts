import { routePartykitRequest } from 'partyserver';

export { GameSessionServer } from './gameSession';
export { PartyServer } from './party';

// Rooms are addressed as /parties/<binding in kebab-case>/<room id>:
// GameSession -> /parties/game-session/<gameSessionId>, Party -> /parties/party/<partyId>
export default {
  async fetch(request, env) {
    return (await routePartykitRequest(request, env)) ?? new Response('Not found', { status: 404 });
  }
} satisfies ExportedHandler<Env>;
