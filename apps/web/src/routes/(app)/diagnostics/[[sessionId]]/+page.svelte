<script lang="ts">
  import { Head } from '$lib/components';
  import { Title, Text, Spacer, Panel, Button, Select, Icon, Link, FormControl } from '@tableslayer/ui';
  import { IconCircleCheckFilled, IconAlertCircleFilled, IconCircleXFilled } from '@tabler/icons-svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { DiagnosticResult } from './+page.server';

  let { data } = $props();
  const diagnostics = $derived(data.diagnostics);
  const sessions = $derived(data.sessions);

  let isRefreshing = $state(false);
  let copied = $state(false);
  let selectedSession = $state<string[]>(diagnostics.selectedSession?.id ? [diagnostics.selectedSession.id] : []);

  const copyAsJson = async () => {
    const exportData = {
      timestamp: diagnostics.timestamp,
      region: diagnostics.region,
      databaseMode: diagnostics.databaseMode,
      session: diagnostics.selectedSession
        ? {
            id: diagnostics.selectedSession.id,
            name: diagnostics.selectedSession.name,
            partyName: diagnostics.selectedSession.partyName,
            sceneCount: diagnostics.selectedSession.sceneCount
          }
        : null,
      testImage: diagnostics.testImagePath,
      totalTime: Math.round(totalTime),
      results: diagnostics.results.map((r) => ({
        name: r.name,
        duration: r.duration,
        status: r.status,
        details: r.details
      }))
    };

    await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    copied = true;
    setTimeout(() => (copied = false), 2000);
  };

  const refresh = async () => {
    isRefreshing = true;
    const currentUrl = $page.url.pathname + $page.url.search;
    await goto(currentUrl, { invalidateAll: true });
    isRefreshing = false;
  };

  const handleSessionChange = async (selected: string[]) => {
    const sessionId = selected[0];
    if (sessionId && sessionId !== diagnostics.selectedSession?.id) {
      isRefreshing = true;
      await goto(`/diagnostics/${sessionId}`, { invalidateAll: true });
      isRefreshing = false;
    }
  };

  // Group sessions by party for the Select component
  const groupedOptions = $derived(() => {
    const groups: Record<string, { label: string; value: string }[]> = {};
    for (const session of sessions) {
      if (!groups[session.partyName]) {
        groups[session.partyName] = [];
      }
      groups[session.partyName].push({
        label: `${session.name} (${session.sceneCount} scenes)`,
        value: session.id
      });
    }
    return groups;
  });

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return 'var(--fgSuccess)';
      case 'warning':
        return 'var(--fgDanger)';
      case 'error':
        return 'var(--fgDanger)';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return IconCircleCheckFilled;
      case 'warning':
        return IconAlertCircleFilled;
      case 'error':
        return IconCircleXFilled;
    }
  };

  const totalTime = $derived(diagnostics.results.reduce((sum, r) => sum + r.duration, 0));
</script>

<Head title="Diagnostics" description="Network performance diagnostics" />

<div class="diagnostics">
  <div class="diagnostics__header">
    <Title as="h1" size="lg">Diagnostics</Title>
    <div class="diagnostics__actions">
      <Button onclick={copyAsJson} variant="ghost">
        {copied ? 'Copied!' : 'Copy JSON'}
      </Button>
      <Button onclick={refresh} disabled={isRefreshing}>
        {isRefreshing ? 'Running...' : 'Re-run tests'}
      </Button>
    </div>
  </div>

  <Spacer size="1.5rem" />

  {#if sessions.length > 0}
    <div class="diagnostics__session-select">
      <FormControl label="Test session" name="session">
        {#snippet input()}
          <Select
            options={groupedOptions()}
            bind:selected={selectedSession}
            onSelectedChange={handleSessionChange}
            disabled={isRefreshing}
          />
        {/snippet}
      </FormControl>
    </div>
    <Spacer size="1rem" />
  {/if}

  <div class="diagnostics__meta">
    <div class="diagnostics__meta-item">
      <Text size="0.75rem" color="var(--fgMuted)">Region</Text>
      <Text size="0.875rem">{diagnostics.region}</Text>
    </div>
    <div class="diagnostics__meta-item">
      <Text size="0.75rem" color="var(--fgMuted)">Database</Text>
      <Text size="0.875rem">{diagnostics.databaseMode}</Text>
    </div>
    <div class="diagnostics__meta-item">
      <Text size="0.75rem" color="var(--fgMuted)">Timestamp</Text>
      <Text size="0.875rem">{new Date(diagnostics.timestamp).toLocaleString()}</Text>
    </div>
    <div class="diagnostics__meta-item">
      <Text size="0.75rem" color="var(--fgMuted)">Total time</Text>
      <Text size="0.875rem">{Math.round(totalTime)} ms</Text>
    </div>
    {#if diagnostics.testImagePath}
      <div class="diagnostics__meta-item diagnostics__meta-item--grow">
        <Text size="0.75rem" color="var(--fgMuted)">Test image</Text>
        <Link href={diagnostics.testImageUrl} target="_blank" class="diagnostics__image-path">
          {diagnostics.testImagePath}
        </Link>
      </div>
    {/if}
  </div>

  <Spacer size="1.5rem" />

  <Panel class="diagnostics__panel">
    <table class="diagnostics__table">
      <thead>
        <tr>
          <th class="diagnostics__th">Test</th>
          <th class="diagnostics__th">Time</th>
          <th class="diagnostics__th">Status</th>
          <th class="diagnostics__th">Details</th>
        </tr>
      </thead>
      <tbody>
        {#each diagnostics.results as result}
          <tr class="diagnostics__row">
            <td class="diagnostics__cell">
              <Text size="0.875rem" weight={500}>{result.name}</Text>
              <Text size="0.75rem" color="var(--fgMuted)">{result.description}</Text>
            </td>
            <td class="diagnostics__cell diagnostics__cell--time">
              <Text size="0.875rem" weight={500}>{result.duration} ms</Text>
            </td>
            <td class="diagnostics__cell diagnostics__cell--status">
              <Icon Icon={getStatusIcon(result.status)} size="1.25rem" color={getStatusColor(result.status)} />
            </td>
            <td class="diagnostics__cell">
              <Text size="0.75rem" color="var(--fgMuted)">{result.details || '-'}</Text>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </Panel>

  <Spacer size="1rem" />

  <Text size="0.75rem" color="var(--fgMuted)">
    Thresholds: Green &lt; expected, Yellow = 2-5x expected, Red &gt; 5x expected or error
  </Text>
</div>

<style>
  .diagnostics {
    max-width: 900px;
    margin: var(--size-12) auto;
    padding: 0 var(--size-4);
  }

  .diagnostics__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .diagnostics__actions {
    display: flex;
    gap: 0.5rem;
  }

  .diagnostics__session-select {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-width: 400px;
  }

  .diagnostics__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
  }

  .diagnostics__meta-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
  }

  .diagnostics__meta-item--grow {
    flex: 1;
  }

  :global(.diagnostics__image-path) {
    font-family: monospace;
    font-size: 0.75rem !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  }

  :global(.diagnostics__panel) {
    padding: 0;
    background: var(--bg);
    border-radius: var(--radius-2);
    overflow: hidden;
  }

  .diagnostics__table {
    width: 100%;
    border-collapse: collapse;
  }

  .diagnostics__th {
    text-align: left;
    padding: 0.75rem 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--fgMuted);
    background: var(--bgOffset);
    border-bottom: 1px solid var(--border);
  }

  .diagnostics__row {
    border-bottom: 1px solid var(--border);
  }

  .diagnostics__row:last-child {
    border-bottom: none;
  }

  .diagnostics__cell {
    padding: 0.75rem 1rem;
    vertical-align: top;
  }

  .diagnostics__cell--time {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .diagnostics__cell--status {
    text-align: center;
    width: 60px;
  }
</style>
