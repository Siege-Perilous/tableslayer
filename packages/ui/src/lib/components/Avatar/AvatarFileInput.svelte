<script lang="ts">
  import { Avatar, Icon, type AvatarFileInputProps } from '../';
  import { IconPhotoCirclePlus } from '@tabler/icons-svelte';

  let {
    files = $bindable(),
    src,
    alt,
    initials,
    isLoading,
    size = 'xl',
    variant = 'round',
    onChange,
    ...restProps
  }: AvatarFileInputProps = $props();

  let avatarPreviewUrl = $state<string | null>(src ?? null);
  let hiddenFileInput: HTMLInputElement | null = null;

  function openFileDialog() {
    hiddenFileInput?.click();
  }

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    avatarPreviewUrl = URL.createObjectURL(file);
    if (onChange) {
      onChange();
    }
    input.value = '';
  }
</script>

<div
  role="button"
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      openFileDialog();
    }
  }}
  aria-label="Change Avatar"
  tabindex="0"
  onclick={openFileDialog}
  class={['avatarFileInput', restProps.class]}
>
  <Avatar src={avatarPreviewUrl || src} {alt} {initials} {isLoading} {size} {variant} {...restProps} />
  <div class="avatarFileInput__overlay">
    <Icon Icon={IconPhotoCirclePlus} size="2rem" stroke={2} />
  </div>
  <input
    type="file"
    bind:files
    accept="image/*"
    bind:this={hiddenFileInput}
    onchange={handleFileChange}
    style={'display: none;'}
  />
</div>

<style>
  .avatarFileInput {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .avatarFileInput__overlay {
    position: absolute;
    width: calc(100% - 4px);
    height: calc(100% - 4px);
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 50%;
    opacity: 0;
  }
  .avatarFileInput:hover .avatarFileInput__overlay {
    opacity: 1;
  }
</style>
