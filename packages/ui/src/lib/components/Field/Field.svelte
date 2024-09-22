<script lang="ts">
  import { Input, Label } from '../';
  import type { FieldProps } from './types';
  let { label, placeholder, type, id }: FieldProps = $props();
</script>

<div class="field">
  <Label {id}>{label}</Label>
  <Input {id} {type} {placeholder} value="" onChange={() => console.log('')} />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }
</style>
