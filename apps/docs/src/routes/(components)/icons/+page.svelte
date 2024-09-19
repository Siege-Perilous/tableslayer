<script lang="ts">
  import { IconHeart, IconAxe, IconSword } from '@tabler/icons-svelte';
  import { Icon } from '@tableslayer/ui';
  import { Example } from '$lib/components';
</script>

<Example title="Icon" propsName="Icon">
  <div class="grid">
    <Icon Icon={IconHeart} />
    <Icon Icon={IconAxe} size="24px" color="blue" />
    <Icon Icon={IconSword} size="3rem" color="red" stroke={1} />
  </div>
</Example>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    align-items: center;
  }
</style>
