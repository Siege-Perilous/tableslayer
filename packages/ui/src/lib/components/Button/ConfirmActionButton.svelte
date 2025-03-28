<script lang="ts">
  import { Button, type ConfirmActionButtonProps } from './';
  let {
    trigger,
    actionMessage,
    actionButtonText = 'Confirm delete',
    action,
    isLoading,
    ...restProps
  }: ConfirmActionButtonProps = $props();

  let isShowingConfirm = $state(false);

  const toggleShowConfirm = () => {
    isShowingConfirm = true;
  };
  const triggerProps = {
    onclick: () => {
      toggleShowConfirm();
    }
  };
</script>

<div class="confirmAction" {...restProps}>
  {@render trigger({ triggerProps })}
  {#if isShowingConfirm}
    <div class="confirmAction__content">
      {@render actionMessage()}
      <div class="confirmAction__buttons">
        <Button onclick={action} variant="danger" {isLoading}>
          {actionButtonText}
        </Button>
        <Button onclick={() => (isShowingConfirm = false)} variant="ghost">Cancel</Button>
      </div>
    </div>
  {/if}
</div>

<style>
  .confirmAction {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }
  .confirmAction__content {
    position: absolute;
    transform: translate(0%, -50%);
    background-color: var(--popoverBg);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-1);
    padding: 1rem;
    z-index: 2;
    border: var(--borderThin);
  }
  .confirmAction__buttons {
    margin-top: 0.5rem;
    display: flex;
    gap: 0.5rem;
  }
</style>
