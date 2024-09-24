<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core';
  import { EffectComposer, RenderPass } from 'postprocessing';
  import { onMount, setContext } from 'svelte';

  const { scene, camera, renderer, size, autoRender, renderStage } = useThrelte();

  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, $camera);
  composer.addPass(renderPass);

  setContext('composer', composer);

  onMount(() => {
    let before = autoRender.current;
    autoRender.set(false);
    return () => autoRender.set(before);
  });

  $effect(() => {
    composer.setSize($size.width, $size.height);
  });

  useTask(
    (delta) => {
      composer.render(delta);
    },
    { stage: renderStage, autoInvalidate: false }
  );
</script>

<slot />
