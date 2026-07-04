<script lang="ts">
  import { Avatar, Popover, Icon } from '../';
  import type { AvatarPopoverProps } from './types';
  let {
    src,
    size = 'md',
    positioning = { placement: 'bottom' },
    content: AvatarPopoverContent
  }: AvatarPopoverProps = $props();
  import { IconChevronDown } from '@tabler/icons-svelte';
</script>

<Popover {positioning}>
  {#snippet trigger()}
    <div class="avatarPopoverTrigger">
      <Avatar {src} {size} />
      <Icon Icon={IconChevronDown} />
    </div>
  {/snippet}
  {#snippet content()}
    {@render AvatarPopoverContent()}
  {/snippet}
</Popover>

<style>
  .avatarPopoverTrigger {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding-right: 0.5rem;
    background: var(--contrastMedium);
    border-radius: var(--radius-3);
  }
</style>
