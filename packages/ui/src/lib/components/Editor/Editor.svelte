<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Link } from '@tiptap/extension-link';
  import { IconBold, IconH1, IconH2, IconH3, IconItalic, IconLink } from '@tabler/icons-svelte';
  import { Icon } from '../Icon';

  let element: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();

  // Create explicit state variables for each button's active state
  let isBold = $state(false);
  let isItalic = $state(false);
  let isLink = $state(false);
  let isParagraph = $state(false);
  let isH1 = $state(false);
  let isH2 = $state(false);
  let isH3 = $state(false);

  // Function to update all active states
  function updateActiveStates() {
    if (!editor) return;

    isBold = editor.isActive('bold');
    isItalic = editor.isActive('italic');
    isLink = editor.isActive('link');
    isParagraph = editor.isActive('paragraph');
    isH1 = editor.isActive('heading', { level: 1 });
    isH2 = editor.isActive('heading', { level: 2 });
    isH3 = editor.isActive('heading', { level: 3 });
  }

  onMount(() => {
    editor = new Editor({
      element: element,
      extensions: [StarterKit, Link],
      content: '<p>Hello World! 🌍️ </p>',
      onSelectionUpdate: () => {
        updateActiveStates();
      },
      onUpdate: () => {
        updateActiveStates();
      },
      onTransaction: () => {
        updateActiveStates();
      }
    });

    // Initialize states
    updateActiveStates();
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
  });

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    // update link
    try {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } catch (e) {
      console.error(e);
    }
  };
</script>

<div class="editor">
  {#if editor}
    <div class="editor__toolbar">
      <button onclick={() => editor?.chain().focus().toggleBold().run()} class:active={isBold}>
        <Icon Icon={IconBold} size="1.5rem" />
      </button>
      <button onclick={() => editor?.chain().focus().toggleItalic().run()} class:active={isItalic}>
        <Icon Icon={IconItalic} size="1.5rem" />
      </button>
      <button onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} class:active={isH1}>
        <Icon Icon={IconH1} size="1.5rem" />
      </button>
      <button onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} class:active={isH2}>
        <Icon Icon={IconH2} size="1.5rem" />
      </button>
      <button onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} class:active={isH3}>
        <Icon Icon={IconH3} size="1.5rem" />
      </button>
      <button onclick={() => editor?.chain().focus().setParagraph().run()} class:active={isParagraph}> P </button>
      <button onclick={setLink} class:active={isLink}>
        <Icon Icon={IconLink} size="1.5rem" />
      </button>
    </div>
  {/if}

  <div class="editor__content">
    <div bind:this={element}></div>
  </div>
</div>

<style>
  .editor {
    width: 100%;
  }
  .editor__toolbar {
    display: flex;
    gap: 0.25rem;
    padding: 0.25rem;
    border: var(--borderThin);
    border-top-right-radius: var(--radius-2);
    border-top-left-radius: var(--radius-2);
  }
  .editor__content {
    border: var(--borderThin);
    border-bottom-right-radius: var(--radius-2);
    border-bottom-left-radius: var(--radius-2);
    border-top: none;
    padding: 1rem;
  }
  button.active {
    background: black;
    color: white;
  }
  :global {
    .tiptap:focus-visible {
      outline: none;
    }
    .editor__content ul {
      list-style-type: disc;
      margin-left: 1rem;
    }
    .editor__content ol {
      list-style-type: decimal;
    }
    .editor__content h1,
    .editor__content h2,
    .editor__content h3 {
      font-family: var(--font-serif);
      font-weight: 600;
    }
    .editor__content h1 {
      font-size: 2rem;
    }
    .editor__content h2 {
      font-size: 1.5rem;
    }
    .editor__content h3 {
      font-size: 1.25rem;
    }
    .editor__content a {
      color: var(--link-color);
      text-decoration: none;
      cursor: pointer;
      font-weight: var(--font-weight-6);
    }
    .editor__content a:hover {
      text-decoration: underline;
    }
  }
</style>
