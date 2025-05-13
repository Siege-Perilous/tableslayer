<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, type JSONContent } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { Link } from '@tiptap/extension-link';
  import Typography from '@tiptap/extension-typography';
  import {
    IconBold,
    IconList,
    IconListNumbers,
    IconItalic,
    IconLink,
    IconSelector,
    IconQuoteFilled,
    IconCheck
  } from '@tabler/icons-svelte';
  import { Icon } from '../Icon';
  import { Popover } from '../Popover';
  import { Button } from '../Button';
  import { Input } from '../Input';
  import { computePosition, autoUpdate, offset, shift, flip } from '@floating-ui/dom';
  import { IconButton } from '../Button';

  let {
    height = 'auto',
    content = $bindable(undefined),
    debug = false,
    editable = true
  }: {
    height?: number | string;
    content?: JSONContent | null | undefined;
    debug?: boolean;
    editable?: boolean;
  } = $props();

  let element: HTMLDivElement | undefined = $state();
  let editor: Editor | undefined = $state();
  let editorReady = $state(false);

  // Since we're now only using JSON content, this is no longer needed
  // const isJsonContent = content !== null && content !== undefined && typeof content === 'object';

  // We'll always use JSON, but for debug purposes we'll keep track of HTML
  let editorHtml = $state('');

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

  // Link popover state
  let linkPopoverVisible = $state(false);
  let linkPopoverElement: HTMLDivElement | undefined = $state();
  let linkInputElement: HTMLInputElement | undefined = $state();
  let currentLinkElement: HTMLAnchorElement | null = $state(null);
  let currentLinkUrl = $state('');
  let cleanupAutoUpdate: (() => void) | undefined;
  let portalContainer: HTMLDivElement | undefined = $state();

  // Create portal container in body when component is mounted
  function createPortalContainer() {
    // Check if portal container already exists
    const existingContainer = document.getElementById('editor-link-portal');
    if (existingContainer) {
      portalContainer = existingContainer as HTMLDivElement;
      return;
    }

    // Create a new portal container
    const container = document.createElement('div');
    container.id = 'editor-link-portal';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
    portalContainer = container;
  }

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
    // Create portal container
    createPortalContainer();

    // Default empty content
    const emptyContent = { type: 'doc', content: [{ type: 'paragraph' }] };

    // Prepare content - always ensure we have valid JSON structure
    let initialContent;

    if (content === null || content === undefined) {
      // Use empty content if nothing provided
      initialContent = emptyContent;
    } else if (typeof content === 'string') {
      // If string was passed (shouldn't happen but just in case), convert to JSON
      try {
        // First, try to parse it as JSON string
        initialContent = JSON.parse(content);
      } catch (e) {
        console.log(e);
        // If it's plain HTML, initialize with it
        initialContent = content;
        // And immediately update our bound content to be JSON
        setTimeout(() => {
          if (editor) {
            content = editor.getJSON();
          }
        }, 0);
      }
    } else {
      // Content is already JSON object
      initialContent = content;
    }

    editor = new Editor({
      editable,
      element: element,
      extensions: [
        StarterKit,
        Typography,
        Link.configure({
          openOnClick: false // Prevent default link opening behavior
        })
      ],
      content: initialContent, // Pass content with fallback for null/undefined
      onSelectionUpdate: () => {
        updateActiveStates();
      },
      onUpdate: ({ editor }) => {
        // Always update content as JSON
        const newJson = editor.getJSON();
        content = newJson;
        // Update HTML for debug purposes only
        editorHtml = editor.getHTML();
        updateActiveStates();
      },
      onTransaction: () => {
        updateActiveStates();
      }
    });

    // Add click handler to the editor content
    if (element) {
      element.addEventListener('click', handleEditorClick);
    }

    editorReady = true;
    updateActiveStates();
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }

    // Clean up event listeners
    if (element) {
      element.removeEventListener('click', handleEditorClick);
    }

    // Clean up floating UI positioning if active
    if (cleanupAutoUpdate) {
      cleanupAutoUpdate();
    }

    // Clean up the popover element from the portal container
    if (linkPopoverElement && portalContainer && portalContainer.contains(linkPopoverElement)) {
      portalContainer.removeChild(linkPopoverElement);
    }

    // Remove portal container if it exists and we are the last editor instance
    if (portalContainer && portalContainer.childNodes.length === 0) {
      if (document.body.contains(portalContainer)) {
        document.body.removeChild(portalContainer);
      }
    }
  });

  function handleEditorClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    const linkElement = target.closest('a');

    // Close any open popovers first
    hideLinkPopover();

    // If clicked on a link, show the popover
    if (linkElement) {
      e.preventDefault(); // Prevent default link behavior
      currentLinkElement = linkElement;
      currentLinkUrl = linkElement.getAttribute('href') || '';
      showLinkPopover(linkElement);
    }
  }

  // This function is used by the <svelte:document> event handler
  function handleDocumentClick(e: MouseEvent) {
    // Only close if clicking outside the popover and link
    if (linkPopoverVisible) {
      const target = e.target as HTMLElement;
      if (
        linkPopoverElement &&
        !linkPopoverElement.contains(target) &&
        currentLinkElement !== target &&
        !currentLinkElement?.contains(target) &&
        !target.closest('.editor__btn') && // Don't close when clicking toolbar buttons
        // Also check if we're clicking inside the editor but not on a link
        !(element?.contains(target) && !target.closest('a'))
      ) {
        hideLinkPopover();
      }
    }
  }

  function getSelectionCoordinates(): { left: number; bottom: number } | null {
    if (!editor) return null;

    const view = editor.view;
    const { from, to } = view.state.selection;

    if (from === to) return null; // No selection

    // Get the DOM range for the current selection
    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);

    return {
      left: (start.left + end.left) / 2,
      bottom: Math.max(start.bottom, end.bottom)
    };
  }

  function showLinkPopover(anchorElement: HTMLElement) {
    if (!linkPopoverElement || !portalContainer) return;

    // Move the popover element to the portal container if it's not already there
    if (!portalContainer.contains(linkPopoverElement)) {
      // Create a new popover element in the portal container
      const popoverClone = linkPopoverElement.cloneNode(true) as HTMLDivElement;
      portalContainer.appendChild(popoverClone);

      // Update our reference to the new popover element
      linkPopoverElement = popoverClone;

      // Find the input element within the cloned popover
      linkInputElement = popoverClone.querySelector('.linkPopover__input') as HTMLInputElement;

      // Setup event handlers for the portal popover
      setupPortalPopoverEvents();
    }

    // Always update the input field value with the current link URL
    if (linkInputElement) {
      linkInputElement.value = currentLinkUrl;
    }

    linkPopoverVisible = true;

    // Position the popover using Floating UI
    if (cleanupAutoUpdate) {
      cleanupAutoUpdate();
    }

    cleanupAutoUpdate = autoUpdate(anchorElement, linkPopoverElement, () => {
      computePosition(anchorElement, linkPopoverElement!, {
        placement: 'bottom',
        middleware: [offset(8), shift(), flip()]
      }).then(({ x, y }) => {
        if (linkPopoverElement) {
          Object.assign(linkPopoverElement.style, {
            left: `${x}px`,
            top: `${y}px`,
            position: 'absolute',
            display: 'block'
          });
        }
      });
    });

    // Focus the input field if we're editing
    setTimeout(() => {
      if (linkInputElement) {
        linkInputElement.focus();
        linkInputElement.select();
      }
    }, 10);
  }

  function hideLinkPopover() {
    linkPopoverVisible = false;
    currentLinkElement = null;
    currentLinkUrl = '';

    if (cleanupAutoUpdate) {
      cleanupAutoUpdate();
      cleanupAutoUpdate = undefined;
    }

    // Hide the popover in the portal if it exists
    if (linkPopoverElement && portalContainer && portalContainer.contains(linkPopoverElement)) {
      linkPopoverElement.style.display = 'none';
    }
  }

  function addOrUpdateLink() {
    if (!editor) return;

    if (currentLinkUrl.trim() === '') {
      removeLink();
      return;
    }

    try {
      // If we're updating an existing link, we need to select it first
      if (currentLinkElement && currentLinkElement.tagName === 'A') {
        const pos = editor.view.posAtDOM(currentLinkElement, 0);
        const end = pos + currentLinkElement.textContent!.length;
        editor.chain().focus().setTextSelection({ from: pos, to: end }).run();
      }

      editor.chain().focus().extendMarkRange('link').setLink({ href: currentLinkUrl }).run();
      hideLinkPopover();
    } catch (e) {
      console.error(e);
    }
  }

  function removeLink() {
    if (!editor) return;

    if (currentLinkElement && currentLinkElement.tagName === 'A') {
      const pos = editor.view.posAtDOM(currentLinkElement, 0);
      const end = pos + currentLinkElement.textContent!.length;
      editor.chain().focus().setTextSelection({ from: pos, to: end }).unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }

    hideLinkPopover();
  }

  function visitLink() {
    if (currentLinkUrl) {
      window.open(currentLinkUrl, '_blank');
      hideLinkPopover();
    }
  }

  // Setup portal popover event handlers when the component is mounted
  function setupPortalPopoverEvents() {
    if (!linkPopoverElement || !portalContainer) return;

    // Add event handlers for the buttons in the portal popover
    const confirmButton = linkPopoverElement.querySelector('.linkPopover__inputRow button') as HTMLElement;
    if (confirmButton) {
      // Use the correct typing approach for TypeScript with Svelte 5
      (confirmButton as unknown as { onclick: typeof addOrUpdateLink }).onclick = addOrUpdateLink;
    }

    // Add event handlers for the visit and remove buttons
    const buttons = linkPopoverElement.querySelectorAll('.linkPopover__actions button');
    if (buttons.length >= 2) {
      (buttons[0] as unknown as { onclick: typeof visitLink }).onclick = visitLink;
      (buttons[1] as unknown as { onclick: typeof removeLink }).onclick = removeLink;
    }

    if (linkInputElement) {
      // Set up keydown handler for Enter key
      (linkInputElement as unknown as { onkeydown: typeof handleLinkInputKeydown }).onkeydown = handleLinkInputKeydown;

      // Set up input handler to keep our state variable in sync
      linkInputElement.addEventListener('input', (e: Event) => {
        currentLinkUrl = (e.target as HTMLInputElement).value;
      });
    }
  }

  function setNewLink() {
    if (!editor) return;

    // For creating a new link (toolbar button)
    hideLinkPopover(); // Close any existing popover first

    const selection = editor.view.state.selection;
    const hasSelection = !selection.empty;

    if (hasSelection) {
      // With selection, first create the link with a temporary URL
      currentLinkUrl = '';
      editor.chain().focus().extendMarkRange('link').setLink({ href: 'https://' }).run();

      // Now find the newly created link
      setTimeout(() => {
        // Get coordinates of the selection
        const coords = getSelectionCoordinates();
        if (!coords) return;

        // Create a temp anchor element for positioning the popover
        const tempElement = document.createElement('span');
        tempElement.style.position = 'absolute';
        tempElement.style.left = `${coords.left}px`;
        tempElement.style.top = `${coords.bottom}px`;
        document.body.appendChild(tempElement);

        currentLinkElement = tempElement as unknown as HTMLAnchorElement;
        showLinkPopover(tempElement);

        // Clean up the temporary element after we're done
        setTimeout(() => {
          if (document.body.contains(tempElement)) {
            document.body.removeChild(tempElement);
          }
        }, 100);
      }, 10);
    } else {
      // For empty selection, insert a placeholder link
      currentLinkUrl = 'https://';

      // Insert link with default text
      editor.chain().focus().insertContent('<a href="https://">link</a>').run();

      // Find the newly inserted link and show popover
      setTimeout(() => {
        if (!element) return;

        const links = element.querySelectorAll('a[href="https://"]');
        if (links && links.length > 0) {
          currentLinkElement = links[links.length - 1] as HTMLAnchorElement;
          showLinkPopover(currentLinkElement);
        }
      }, 10);
    }
  }

  // Handle enter key in the link input
  function handleLinkInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addOrUpdateLink();
    }
  }
</script>

<svelte:document on:click={handleDocumentClick} />

<div class={['editor', !editable && 'editor--notEdtiable']} style={`height: ${height}; max-height: ${height}`}>
  {#if editable}
    <div class="editor__toolbar">
      {#if editor}
        <button
          onclick={() => editor?.chain().focus().toggleBold().run()}
          class={['editor__btn', isBold && 'isActive']}
        >
          <Icon Icon={IconBold} size="20px" stroke={2} />
        </button>
        <button
          onclick={() => editor?.chain().focus().toggleItalic().run()}
          class={['editor__btn', isItalic && 'isActive']}
        >
          <Icon Icon={IconItalic} size="20px" stroke={2} />
        </button>
        <button onclick={setNewLink} class={['editor__btn', isLink && 'isActive']}>
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
      {/if}
    </div>
  {/if}

  <div class="editor__content">
    <div bind:this={element}></div>
  </div>

  <!-- Link Popover Template (hidden) - Will be cloned to portal container -->
  <div bind:this={linkPopoverElement} class="linkPopover" style="display: none;">
    <div class="linkPopover__content">
      <div class="linkPopover__inputRow">
        <Input
          bind:element={linkInputElement}
          type="text"
          bind:value={currentLinkUrl}
          placeholder="https://"
          class="linkPopover__input"
          onkeydown={handleLinkInputKeydown}
        />
        <IconButton onclick={addOrUpdateLink}>
          <Icon Icon={IconCheck} stroke={2} />
        </IconButton>
      </div>
      <div class="linkPopover__actions">
        <Button onclick={visitLink}>Go to link</Button>
        <Button variant="danger" onclick={removeLink}>Remove</Button>
      </div>
    </div>
  </div>

  {#if debug}
    <div class="editor__state">
      <h4>Editor Status: {editorReady ? 'Ready' : 'Loading...'}</h4>
      <h4>Content Type: JSON</h4>
      {#if content === null || content === undefined}
        <pre>null/undefined</pre>
      {:else}
        <pre>{JSON.stringify(content, null, 2)}</pre>
      {/if}

      <h4>HTML representation:</h4>
      <pre>{editorHtml}</pre>
    </div>
  {/if}
</div>

<style>
  .editor {
    position: relative;
    width: 100%;
    border: var(--borderThin);
    border-radius: var(--radius-2);
    overflow-y: auto;
  }
  .editor.editor--notEdtiable {
    pointer-events: none;
    border: none;
    border-radius: 0;
  }
  .editor.editor--notEdtiable .editor__content {
    pointer-events: none;
    padding: 0;
  }
  .editor__toolbar {
    position: sticky;
    top: 0;
    background-color: var(--bg);
    z-index: 2;
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 0.5rem;
  }
  .editor__content {
    padding: 1rem;
    position: relative;
  }
  .editor__state {
    padding: 1rem;
    border-top: var(--borderThin);
    background-color: var(--contrastLow);
    font-size: 0.85rem;
  }
  .editor__state pre {
    max-height: 150px;
    overflow-y: auto;
    background-color: var(--contrastMedium);
    padding: 0.5rem;
    border-radius: var(--radius-2);
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

  /* Link Popover Styles */
  .linkPopover {
    position: absolute;
    z-index: 9999;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  }
  .linkPopover__content {
    box-shadow: var(--shadow-1);
    background-color: var(--bg);
    border: var(--borderThin);
    border-radius: var(--radius-2);
    padding: 0.5rem;
    width: 280px;
  }
  .linkPopover__inputRow {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  :global(#editor-link-portal) {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9999;
    pointer-events: none;
  }
  :global(#editor-link-portal .linkPopover) {
    pointer-events: auto;
  }
  :global {
    .tiptap:focus-visible {
      outline: none;
    }
    .editor__content p {
      line-height: 1.5;
    }
    .editor__content ul {
      list-style-type: disc;
      margin-left: 1.5rem;
    }
    .editor__content ol {
      list-style-type: decimal;
      margin-left: 1.5rem;
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
