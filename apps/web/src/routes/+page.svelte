<script lang="ts">
  import { MyCounterButton } from '@tableslayer/ui';
  export let data;
</script>

<h1>Web</h1>
<MyCounterButton />
{#if data.user && data.user.email}
  {data.user.email}
{/if}
