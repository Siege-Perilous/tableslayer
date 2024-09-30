<script lang="ts">
  import { Avatar, Popover, Icon } from '../';
  import type { AvatarPopoverProps } from './types';
  let { src, size = 'md', content: AvatarPopoverContent }: AvatarPopoverProps = $props();
  import { IconChevronDown } from '@tabler/icons-svelte';
</script>

<Popover>
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
    gap: var(--size-2);
    padding-right: var(--size-2);
    background: var(--contrastMedium);
    border-radius: var(--radius-3);
  }
</style>
