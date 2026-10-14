import { routePartykitRequest } from 'partyserver';

export { GameSessionServer } from './gameSession';
export { PartyServer } from './party';

// Rooms are addressed as /parties/<binding in kebab-case>/<room id>:
// GameSession -> /parties/game-session/<gameSessionId>, Party -> /parties/party/<partyId>
const LEGACY_NAMESPACES: Record<string, string> = { game_session: 'game-session' };

// Clients built before the PartyServer move still connect to the PartyKit-era
// namespace; map it so an app deploy and a worker deploy never have to coincide
const withCurrentNamespace = (request: Request) => {
  const url = new URL(request.url);
  const [, prefix, namespace] = url.pathname.split('/');
  const current = prefix === 'parties' && namespace ? LEGACY_NAMESPACES[namespace] : undefined;
  if (!current) return request;
  url.pathname = url.pathname.replace(`/parties/${namespace}/`, `/parties/${current}/`);
  return new Request(url, request);
};

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(withCurrentNamespace(request), env)) ?? new Response('Not found', { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
