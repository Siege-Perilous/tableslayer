<script lang="ts">
  import { IconPinFilled } from '@tabler/icons-svelte';

  interface Props {
    visible: boolean;
    position: { x: number; y: number };
    onPersist: () => void;
    onDismiss: () => void;
  }

  const { visible, position, onPersist, onDismiss }: Props = $props();

  // Offset button slightly from touch point
  const OFFSET_X = 20;
  const OFFSET_Y = -40;

  function handleBackdropClick() {
    onDismiss();
  }

  function handlePersistClick(e: MouseEvent | TouchEvent) {
    e.stopPropagation();
    onPersist();
  }
</script>

{#if visible}
  <div class="persistButton">
    <!-- Transparent backdrop to catch clicks outside -->
    <button class="persistButton__backdrop" onclick={handleBackdropClick} type="button" aria-label="Dismiss"></button>

    <!-- The persist button -->
    <button
      class="persistButton__btn"
      style:left="{position.x + OFFSET_X}px"
      style:top="{position.y + OFFSET_Y}px"
      onclick={handlePersistClick}
      type="button"
      aria-label="Persist drawing"
    >
      <IconPinFilled size={20} stroke={2} />
    </button>
  </div>
{/if}

<style>
  .persistButton {
    position: fixed;
    inset: 0;
    pointer-events: auto;
    z-index: 500;
  }

  .persistButton__backdrop {
    position: absolute;
    inset: 0;
    background: transparent;
    border: none;
    cursor: default;
    padding: 0;
  }

  .persistButton__btn {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    padding: 0;
    background: var(--fgPrimary);
    border: 2px solid var(--bg);
    border-radius: 50%;
    color: var(--bg);
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    transform: translate(-50%, -50%);
    animation: persistButton__fadeIn 0.15s ease-out;
  }

  .persistButton__btn:hover {
    background: var(--fg);
    transform: translate(-50%, -50%) scale(1.1);
  }

  .persistButton__btn:active {
    transform: translate(-50%, -50%) scale(0.95);
  }

  @keyframes persistButton__fadeIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
</style>
