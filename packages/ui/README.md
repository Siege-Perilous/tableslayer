# @tableslayer/ui

A Svelte 5 component library for building Table Slayer applications.

## Installation

```bash
pnpm add @tableslayer/ui
```

### Peer dependencies

This package requires the following peer dependencies:

```bash
pnpm add svelte @sveltejs/kit @melt-ui/svelte
```

## Usage

Import components and styles in your Svelte application:

```svelte
<script>
  import { Button, Text, Icon } from '@tableslayer/ui';
  import '@tableslayer/ui/styles/globals.css';
</script>

<Button>Click me</Button>
```

## Available components

The library includes:

- Layout components (Box, Container, etc.)
- Form components (Button, Input, Select, etc.)
- Typography components (Text, Heading, etc.)
- Feedback components (Toast, Dialog, etc.)
- Navigation components (Tabs, Menu, etc.)
- And more

## License

FSL-1.1-ALv2 - See [LICENSE.md](./LICENSE.md) for details.
