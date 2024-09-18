<script lang="ts">
  import { Button, ColorMode } from '@tableslayer/ui';
</script>

<Button>Hello I'm button colored by the system theme</Button>

<ColorMode mode="light">
  <p>This is light mode text</p>
  <Button>Hello I'm a light button</Button>
</ColorMode>

<ColorMode mode="dark">
  <p>This is dark mode text</p>
  <Button>Hello I'm a dark button</Button>
</ColorMode>
