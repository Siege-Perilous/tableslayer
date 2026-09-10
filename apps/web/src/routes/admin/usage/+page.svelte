<script lang="ts">
  import { goto, invalidate } from '$app/navigation';
  import { Head } from '$lib/components';
  import { Button, Link, RadioButton, Spacer, Table, Td, Text, Th, Title } from '@tableslayer/ui';

  let { data } = $props();
  const usage = $derived(data.usage);

  const windowOptions = $derived(
    data.windowOptions.map((days) => ({
      label: days === 1 ? '24 hours' : `${days} days`,
      value: String(days)
    }))
  );

  let refreshing = $state(false);
  const refresh = async () => {
    refreshing = true;
    try {
      await invalidate('admin:usage');
    } finally {
      refreshing = false;
    }
  };

  let expandedParties = $state(new Set<string>());
  const toggleParty = (partyId: string) => {
    const next = new Set(expandedParties);
    if (next.has(partyId)) next.delete(partyId);
    else next.add(partyId);
    expandedParties = next;
  };

  const hours = (seconds: number) => (seconds / 3600).toFixed(1);
  const percent = (share: number) => `${Math.round(share * 100)}%`;
  const gbs = (value: number) => `${Math.round(value / 1000)}k`;
  const usd = (value: number) => `$${value.toFixed(2)}`;
  // Billing cycle bounds are midnight UTC; show them as such rather than shifted into the viewer's zone
  const shortDate = (ms: number) =>
    new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const liveRoomLabel = (room: { sessionName: string | null; connections: number }) =>
    `${room.sessionName ?? 'party room'}: ${room.connections}`;
  const timeAgo = (ms: number | null) => {
    if (ms === null) return '-';
    const minutes = Math.round((usage.generatedAt - ms) / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const h = Math.round(minutes / 60);
    if (h < 48) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  };

  const gaugeShare = (used: number, allowance: number) => Math.min(1, used / allowance);
</script>

<Head title="Admin - Realtime usage" description="Realtime room usage by party" />

<div class="usage">
  <div class="usage__header">
    <Title as="h1" size="md">Realtime usage</Title>
    <div class="usage__controls">
      <RadioButton
        options={windowOptions}
        selected={String(usage.windowDays)}
        onSelectedChange={(value) => goto(`/admin/usage?days=${value}`)}
      />
      <Button size="sm" variant="ghost" isLoading={refreshing} disabled={refreshing} onclick={refresh}>Refresh</Button>
    </div>
  </div>
  <Text color="var(--fgMuted)">
    Room hours are wall-clock time a game session room held at least one socket. A sitting is a room-day with two or
    more sockets and at least five persisted edits.
  </Text>

  <Spacer size="1.5rem" />

  <div class="usage__stats">
    <div class="usage__stat">
      <span class="usage__stat-value">{hours(usage.summary.activeSeconds)}</span>
      <span class="usage__stat-label">Room hours</span>
    </div>
    <div class="usage__stat">
      <span class="usage__stat-value">{percent(usage.summary.idleShare)}</span>
      <span class="usage__stat-label">Idle share</span>
    </div>
    <div class="usage__stat">
      <span class="usage__stat-value">{usage.summary.sittings}</span>
      <span class="usage__stat-label">Sittings</span>
    </div>
    <div class="usage__stat">
      <span class="usage__stat-value">{usage.summary.roomsWithPlay} / {usage.summary.roomsTouched}</span>
      <span class="usage__stat-label">Rooms with play / touched</span>
    </div>
    <div class="usage__stat">
      <span class="usage__stat-value">{hours(usage.summary.partyRoomActiveSeconds)}</span>
      <span class="usage__stat-label">Party room hours</span>
    </div>
    <div class="usage__stat">
      <span class="usage__stat-value">{usage.summary.liveRooms}</span>
      <span class="usage__stat-label">Live rooms</span>
    </div>
  </div>

  <Spacer size="1.5rem" />

  <div class="usage__section">
    <Title as="h2" size="sm">Cloudflare billing cycle</Title>
    <Spacer size="0.5rem" />
    {#await data.streamed.cloudflare}
      <Text color="var(--fgMuted)">Loading Cloudflare analytics...</Text>
    {:then cloudflare}
      {#if !cloudflare}
        <Text color="var(--fgMuted)">
          Give CLOUDFLARE_WORKERS_KEY the Account Analytics: Read scope to show Durable Objects usage for the current
          cycle.
        </Text>
      {:else if cloudflare.error}
        <Text color="var(--fgDanger)">Could not load Cloudflare analytics: {cloudflare.error}</Text>
      {:else}
        <div class={['usage__gauge', cloudflare.gbSeconds > cloudflare.allowanceGbSeconds && 'usage__gauge--over']}>
          <div
            class="usage__gauge-bar"
            style:--share={gaugeShare(cloudflare.gbSeconds, cloudflare.allowanceGbSeconds)}
          ></div>
        </div>
        <Spacer size="0.5rem" />
        <Text>
          {gbs(cloudflare.gbSeconds)} of {gbs(cloudflare.allowanceGbSeconds)} GB-s used since {shortDate(
            cloudflare.cycleStart
          )}. Projected {gbs(cloudflare.projectedGbSeconds)} GB-s by {shortDate(cloudflare.cycleEnd)}. Estimated overage {usd(
            cloudflare.estimatedCostUsd
          )} so far, {usd(cloudflare.projectedCostUsd)} projected.
        </Text>
      {/if}
    {:catch}
      <Text color="var(--fgDanger)">Could not load Cloudflare analytics.</Text>
    {/await}
  </div>

  <Spacer size="1.5rem" />

  <div class="usage__section">
    <Title as="h2" size="sm">Parties</Title>
    <Spacer size="0.5rem" />
    {#if usage.parties.length === 0}
      <Text color="var(--fgMuted)">No realtime activity in this window.</Text>
    {:else}
      <div class="usage__table-wrapper">
        <Table>
          <thead>
            <tr>
              <Th>Party</Th>
              <Th>Plan</Th>
              <Th>Admins</Th>
              <Th>Sessions</Th>
              <Th>Sittings</Th>
              <Th>Room hours</Th>
              <Th>Idle</Th>
              <Th>Last active</Th>
              <Th>Details</Th>
            </tr>
          </thead>
          <tbody>
            {#each usage.parties as party (party.id)}
              <tr>
                <Td>
                  {#if party.slug}
                    <Link href="/{party.slug}">{party.name}</Link>
                  {:else}
                    {party.name}
                  {/if}
                  {#if party.liveRooms.length > 0}
                    <span class="usage__live-pill" title={party.liveRooms.map(liveRoomLabel).join(', ')}>
                      live · {party.liveClients} client{party.liveClients === 1 ? '' : 's'}
                    </span>
                  {/if}
                </Td>
                <Td>
                  <span class={['usage__plan', party.isUpgraded ? 'usage__plan--upgraded' : 'usage__plan--free']}>
                    {party.plan}{party.planStatus && party.planStatus !== 'active' ? ` (${party.planStatus})` : ''}
                  </span>
                </Td>
                <Td>
                  {#if party.adminEmails.length === 0}
                    <span class="usage__muted">-</span>
                  {:else}
                    <div class="usage__emails">
                      {#each party.adminEmails as email (email)}
                        <span>{email}</span>
                      {/each}
                    </div>
                  {/if}
                </Td>
                <Td>{party.sessionCount}</Td>
                <Td>{party.sittings}</Td>
                <Td>{hours(party.activeSeconds)}</Td>
                <Td>{percent(party.idleShare)}</Td>
                <Td>{timeAgo(party.lastActiveAt)}</Td>
                <Td>
                  {#if party.sessions.length > 0}
                    <Button size="sm" variant="ghost" onclick={() => toggleParty(party.id)}>
                      {expandedParties.has(party.id) ? 'Hide sessions' : 'Show sessions'}
                    </Button>
                  {/if}
                </Td>
              </tr>
              {#if expandedParties.has(party.id)}
                <tr class="usage__sessions-row">
                  <td colspan="9">
                    <Table>
                      <thead>
                        <tr>
                          <Th>Session</Th>
                          <Th>Room hours</Th>
                          <Th>Idle</Th>
                          <Th>Sittings</Th>
                          <Th>Peak sockets</Th>
                          <Th>Edits</Th>
                          <Th>Last active</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each party.sessions as session (session.gameSessionId)}
                          <tr>
                            <Td>
                              {#if session.slug && party.slug}
                                <Link href="/{party.slug}/{session.slug}">{session.name}</Link>
                              {:else}
                                {session.name}
                              {/if}
                              {#if session.live}
                                <span class="usage__live-pill">live</span>
                              {/if}
                            </Td>
                            <Td>{hours(session.activeSeconds)}</Td>
                            <Td>{percent(session.idleShare)}</Td>
                            <Td>{session.sittings}</Td>
                            <Td>{session.peakConnections}</Td>
                            <Td>{session.editCount}</Td>
                            <Td>{timeAgo(session.lastActiveAt)}</Td>
                          </tr>
                        {/each}
                      </tbody>
                    </Table>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </Table>
      </div>
    {/if}
  </div>

  <Spacer size="1.5rem" />
  <Text color="var(--fgMuted)" size="0.875rem">
    Generated {new Date(usage.generatedAt).toLocaleString()}. Activity older than 90 days is pruned.
  </Text>
</div>

<style>
  .usage {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
  }

  .usage__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 0.5rem;
  }

  .usage__controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .usage__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 1rem;
  }

  .usage__stat {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    border: var(--borderThin);
    border-radius: 0.5rem;
  }

  .usage__stat-value {
    font-size: 1.5rem;
    font-weight: 600;
  }

  .usage__stat-label {
    color: var(--fgMuted);
    font-size: 0.875rem;
  }

  .usage__gauge {
    height: 0.75rem;
    border-radius: 999px;
    background: var(--contrastLow);
    overflow: hidden;
  }

  .usage__gauge-bar {
    height: 100%;
    width: calc(var(--share) * 100%);
    background: var(--fgPrimary);
  }

  .usage__gauge--over .usage__gauge-bar {
    background: var(--fgDanger);
  }

  .usage__live-pill {
    margin-left: 0.5rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-size: 0.75rem;
    color: var(--fgSuccess);
    border: var(--borderThin);
  }

  .usage__muted {
    color: var(--fgMuted);
  }

  .usage__table-wrapper {
    overflow-x: auto;
  }

  .usage__table-wrapper :global(table) {
    width: 100%;
    min-width: 900px;
  }

  .usage__sessions-row td {
    padding: 1rem 0 1.5rem 2rem;
  }

  .usage__plan {
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .usage__plan--upgraded {
    color: var(--fgSuccess);
    border: var(--borderThin);
  }

  .usage__plan--free {
    color: var(--fgMuted);
  }

  .usage__emails {
    display: flex;
    flex-direction: column;
    font-size: 0.875rem;
  }
</style>
