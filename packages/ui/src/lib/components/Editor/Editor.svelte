<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Link } from '@tiptap/extension-link';
  import {
    IconBold,
    IconList,
    IconListNumbers,
    IconItalic,
    IconLink,
    IconSelector,
    IconQuoteFilled
  } from '@tabler/icons-svelte';
  import { Icon } from '../Icon';
  import { Popover } from '../Popover';

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
  let isBulletList = $state(false);
  let isOrderedList = $state(false);
  let isBlockquote = $state(false);

  const textType = $derived.by(() => {
    if (isH1) return 'Huge';
    if (isH2) return 'Large';
    if (isH3) return 'Medium';
    if (isParagraph) return 'Normal';
    return '';
  });

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
    isBlockquote = editor.isActive('blockquote');
    isBulletList = editor.isActive('bulletList');
    isOrderedList = editor.isActive('orderedList');
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

  $inspect(textType);
</script>

<div class="editor">
  {#if editor}
    <div class="editor__toolbar">
      <button onclick={() => editor?.chain().focus().toggleBold().run()} class={['editor__btn', isBold && 'isActive']}>
        <Icon Icon={IconBold} size="20px" stroke={2} />
      </button>
      <button
        onclick={() => editor?.chain().focus().toggleItalic().run()}
        class={['editor__btn', isItalic && 'isActive']}
      >
        <Icon Icon={IconItalic} size="20px" stroke={2} />
      </button>
      <button onclick={setLink} class={['editor__btn', isLink && 'isActive']}>
        <Icon Icon={IconLink} size="20px" stroke={2} />
      </button>
      <button
        onclick={() => editor?.chain().focus().toggleBulletList().run()}
        class={['editor__btn', isBulletList && 'isActive']}
      >
        <Icon Icon={IconList} size="20px" stroke={2} />
      </button>
      <button
        onclick={() => editor?.chain().focus().toggleOrderedList().run()}
        class={['editor__btn', isOrderedList && 'isActive']}
      >
        <Icon Icon={IconListNumbers} size="20px" stroke={2} />
      </button>
      <button
        onclick={() => editor?.chain().focus().toggleBlockquote().run()}
        class={['editor__btn', isBlockquote && 'isActive']}
      >
        <Icon Icon={IconQuoteFilled} size="20px" stroke={2} />
      </button>
      <Popover>
        {#snippet trigger()}
          <div class="editor__toolbarTrigger">
            {textType}
            <Icon Icon={IconSelector} size="1rem" color="var(--fgMuted)" />
          </div>
        {/snippet}
        {#snippet content()}
          <div class="editor__toolbarTextOptions">
            <button
              onclick={() => editor?.chain().focus().setParagraph().run()}
              class:active={['editor__toolbarTextP', isParagraph && 'isActive']}
            >
              Normal
            </button>
            <button
              onclick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              class={['editor__toolbarTextH3', isH3 && 'isActive']}
            >
              Medium
            </button>
            <button
              onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              class={['editor__toolbarTextH2', isH2 && 'isActive']}
            >
              Large
            </button>
            <button
              onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              class={['editor__toolbarTextH1', isH1 && 'isActive']}
            >
              Huge
            </button>
          </div>
        {/snippet}
      </Popover>
    </div>
  {/if}

  <div class="editor__content">
    <div bind:this={element}></div>
  </div>
</div>

<style>
  .editor {
    width: 100%;
    border: var(--borderThin);
    border-radius: var(--radius-2);
  }
  .editor__toolbar {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 0.5rem;
  }
  .editor__content {
    padding: 1rem;
    position: relative;
  }

  .editor__btn {
    border: solid 2px transparent;
    border-radius: var(--radius-2);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    height: 2rem;
    width: 2rem;
  }
  .editor__btn.isActive {
    border-color: var(--fg);
  }
  .editor__btn:hover {
    background-color: var(--iconBtn-bgHover);
    border: var(--iconBtn-borderHover);
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
      margin-left: 1rem;
    }
    .editor__content h1,
    .editor__content h2,
    .editor__content h3 {
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
    .editor__content strong {
      font-weight: 700;
    }
    .editor__content em {
      font-style: italic;
    }
    .editor__content blockquote {
      border-left: 4px solid var(--contrastMedium);
      color: var(--fgMuted);
      padding-left: 1rem;
      margin-left: 0;
      font-family: var(--font-sans);
    }
    .editor__content hr {
      height: 1px;
      background-color: var(--contrastMedium);
    }
    .editor__toolbarTextOptions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .editor__toolbarTextOptions button {
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      width: 100%;
    }
    .editor__toolbarTextOptions button:hover {
      background-color: var(--contrastLow);
    }

    .editor__toolbarTextH1,
    .editor__toolbarTextH2,
    .editor__toolbarTextH3 {
      font-weight: 600;
    }
    .editor__toolbarTextP {
      font-weight: normal;
    }
    .editor__toolbarTextH1 {
      font-size: 2.5rem;
    }
    .editor__toolbarTextH2 {
      font-size: 2rem;
    }
    .editor__toolbarTextH3 {
      font-size: 1.5rem;
    }
    .editor__toolbarTrigger {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      border: solid 2px transparent;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-2);
    }
    .editor__toolbarTrigger:hover {
      background-color: var(--iconBtn-bgHover);
      border: var(--iconBtn-borderHover);
    }
  }
</style>
