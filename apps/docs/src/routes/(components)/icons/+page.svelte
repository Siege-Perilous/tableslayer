<script lang="ts">
  import { IconHeart, IconAxe, IconSword } from '@tabler/icons-svelte';
  import { ColorModeCompare, Icon, PropsTable } from '@tableslayer/ui';
</script>

<ColorModeCompare>
  <div class="grid">
    <Icon Icon={IconHeart} />
    <Icon Icon={IconAxe} size="24px" color="blue" />
    <Icon Icon={IconSword} size="3rem" color="red" stroke={1} />
  </div>
</ColorModeCompare>

<PropsTable componentName="Icon" />

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    align-items: center;
  }
</style>
