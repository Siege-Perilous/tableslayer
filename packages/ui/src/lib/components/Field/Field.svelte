<script lang="ts">
  import { Input, Label } from '../';
  import type { FieldProps } from './types';
  let { label, placeholder, type, id }: FieldProps = $props();
</script>

<div class="field">
  <Label {id} class="field__label">{label}</Label>
  <Input {id} {type} {placeholder} value="" />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }
  :global(.field .field__label) {
    padding-left: var(--size-3);
  }
</style>
