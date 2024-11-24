<script lang="ts">
  import { CardFan } from '@tableslayer/ui';
  import { Example } from '$lib/components';
  const images = [
    'https://files.tableslayer.com/maps/01.jpeg',
    'https://files.tableslayer.com/maps/02.jpeg',
    'https://files.tableslayer.com/maps/03.jpeg',
    'https://files.tableslayer.com/maps/04.jpeg',
    'https://files.tableslayer.com/maps/05.jpeg'
  ];
</script>

<Example title="CardFan" propsName="CardFan">
  <CardFan {images} />
</Example>
