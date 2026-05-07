<script lang="ts">
  import { Icon, Button } from '@tableslayer/ui';
  import { IconSchool } from '@tabler/icons-svelte';

  type Props = {
    onclick: () => void;
  };

  let { onclick }: Props = $props();
</script>

<div class="checklistHelp">
  <Button as="div" variant="ghost" class="checklistHelp__button" {onclick} data-testid="checklistHelpButton">
    {#snippet start()}
      <Icon Icon={IconSchool} size="1.5rem" />
    {/snippet}
    Learn
  </Button>
</div>

<style>
  :global {
    .checklistHelp__button {
      text-shadow:
        0 0 2px rgba(0, 0, 0, 0.8),
        0 0 8px rgba(0, 0, 0, 0.5);
    }
  }

  .checklistHelp {
    position: absolute;
    bottom: 1rem;
    right: 1rem;
    display: flex;
    z-index: 1;
  }

  @container stageWrapper (max-width: 768px) {
    .checklistHelp {
      visibility: hidden;
    }
  }
</style>
