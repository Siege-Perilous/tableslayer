<script lang="ts">
  import { type HeadProps } from './types';
  import { page } from '$app/state';
  let {
    title = 'Table Slayer',
    description = 'Create animated battle maps for in person RPG games',
    image = `https://tableslayer.com/og.png`
  }: HeadProps = $props();
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:image" content={image} />
  <meta property="og:url" content={page.url.href} />
  <link rel="canonical" href={page.url.href} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
  <meta name="twitter:url" content={page.url.href} />
</svelte:head>
