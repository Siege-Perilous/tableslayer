<script lang="ts">
  import { Avatar, type AvatarFileInputProps } from '../';

  let {
    files = $bindable(),
    src,
    alt,
    initials,
    isLoading,
    size = 'xl',
    variant = 'round',
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

    const file = input.files[0]; // Bind selected file
    avatarPreviewUrl = URL.createObjectURL(file); // Create preview URL
    input.value = ''; // Reset input for re-selection
  }
</script>

<button type="button" onclick={openFileDialog} class="avatar-uploader__button">
  <Avatar src={avatarPreviewUrl || src} {alt} {initials} {isLoading} {size} {variant} {...restProps} />
  <input
    type="file"
    bind:files
    accept="image/*"
    bind:this={hiddenFileInput}
    onchange={handleFileChange}
    style={'display: none;'}
  />
</button>
