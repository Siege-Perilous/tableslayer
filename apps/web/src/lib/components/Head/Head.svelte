<script lang="ts">
  import { type HeadProps } from './types';
  import { page } from '$app/state';
  import { dev } from '$app/environment';
  let {
    title = 'Table Slayer',
    description = 'Create animated battle maps for in person RPG games',
    image = `https://tableslayer.com/og.png`
  }: HeadProps = $props();

  const logo = dev ? '/logo-dev.png' : '/logo.png';
</script>

<svelte:head>
  <meta charset="utf-8" />
  <link rel="apple-touch-icon" sizes="180x180" href={logo} />
  <link rel="icon" type="image/png" sizes="32x32" href={logo} />
  <link rel="icon" type="image/png" sizes="16x16" href={logo} />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
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
