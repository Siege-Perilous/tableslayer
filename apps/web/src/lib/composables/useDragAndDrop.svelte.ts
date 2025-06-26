import { onDestroy } from 'svelte';

interface DragAndDropOptions<T> {
  onReorder: (fromId: string, toId: string) => void;
  getItemId: (item: T) => string;
  isDisabled?: (itemId: string) => boolean;
}

interface DragPreviewStyles {
  width?: string;
  height?: string;
  position?: string;
  borderColor?: string;
  backgroundColor?: string;
  cursor?: string;
  zIndex?: string;
  pointerEvents?: string;
  left?: string;
  top?: string;
  boxShadow?: string;
  [key: string]: string | undefined;
}

export function useDragAndDrop<T>(options: DragAndDropOptions<T>) {
  const { onReorder, getItemId, isDisabled } = options;

  // Drag and drop state
  let draggedItem = $state<string | null>(null);
  let draggedOverItem = $state<string | null>(null);
  let dragPreviewElement: HTMLElement | null = null;
  let isDragging = $state(false);

  // Clean up drag preview element
  const cleanupDragPreview = () => {
    if (dragPreviewElement) {
      try {
        document.body.removeChild(dragPreviewElement);
      } catch {
        // Element might already be removed
      }
      dragPreviewElement = null;
    }
  };

  // Apply styles to the drag preview clone
  const applyDragPreviewStyles = (
    preview: HTMLElement,
    original: HTMLElement,
    event: DragEvent,
    customStyles?: DragPreviewStyles
  ) => {
    const rect = original.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const defaultStyles: DragPreviewStyles = {
      width: `${original.offsetWidth}px`,
      height: `${original.offsetHeight}px`,
      position: 'fixed',
      borderColor: 'var(--fg)',
      backgroundColor: 'var(--bg)',
      cursor: 'grabbing',
      zIndex: '1000',
      pointerEvents: 'none',
      left: `${event.clientX - offsetX}px`,
      top: `${event.clientY - offsetY}px`,
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
    };

    Object.assign(preview.style, { ...defaultStyles, ...customStyles });

    return { offsetX, offsetY };
  };

  // Drag and drop handlers
  const handleDragStart = (e: DragEvent, itemId: string, customPreviewStyles?: DragPreviewStyles) => {
    // Check if dragging is disabled for this item
    if (isDisabled && isDisabled(itemId)) {
      e.preventDefault();
      return;
    }

    draggedItem = itemId;
    isDragging = true;

    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', ''); // Required for Firefox

      // Create an invisible drag image
      const emptyImg = new Image();
      emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer.setDragImage(emptyImg, 0, 0);

      // Create the custom drag preview
      const original = e.currentTarget as HTMLElement;
      const preview = original.cloneNode(true) as HTMLElement;
      const { offsetX, offsetY } = applyDragPreviewStyles(preview, original, e, customPreviewStyles);

      // Add to DOM
      document.body.appendChild(preview);
      dragPreviewElement = preview;

      // Add event listener to move the preview with the cursor
      const handleDragMove = (moveEvent: DragEvent) => {
        if (dragPreviewElement) {
          dragPreviewElement.style.left = moveEvent.clientX - offsetX + 'px';
          dragPreviewElement.style.top = moveEvent.clientY - offsetY + 'px';
        }
      };

      document.addEventListener('dragover', handleDragMove);

      // Store the cleanup function for later
      (e.currentTarget as HTMLElement & { _dragMoveHandler?: (e: DragEvent) => void })._dragMoveHandler =
        handleDragMove;
    }
  };

  const handleDragOver = (e: DragEvent, itemId: string) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    if (draggedItem && draggedItem !== itemId) {
      draggedOverItem = itemId;
    }
  };

  const handleDragLeave = () => {
    draggedOverItem = null;
  };

  const handleDrop = (e: DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== targetId) {
      onReorder(draggedItem, targetId);
    }
    draggedItem = null;
    draggedOverItem = null;
  };

  const handleDragEnd = (e: DragEvent) => {
    // Clean up the drag preview
    cleanupDragPreview();

    // Remove the drag move handler
    const handler = (e.currentTarget as HTMLElement & { _dragMoveHandler?: (e: DragEvent) => void })?._dragMoveHandler;
    if (handler) {
      document.removeEventListener('dragover', handler);
      delete (e.currentTarget as HTMLElement & { _dragMoveHandler?: (e: DragEvent) => void })._dragMoveHandler;
    }

    draggedItem = null;
    draggedOverItem = null;
    isDragging = false;
  };

  // Touch handlers for mobile
  let touchStartY: number = 0;
  let dragElement: HTMLElement | null = null;

  const handleTouchStart = (e: TouchEvent, itemId: string, element: HTMLElement) => {
    const touch = e.touches[0];
    touchStartY = touch.clientY;
    draggedItem = itemId;
    dragElement = element;
    isDragging = true;

    // Add touch move listener to track dragging
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!draggedItem || !dragElement) return;

    e.preventDefault(); // Prevent scrolling while dragging

    const touch = e.touches[0];
    const currentY = touch.clientY;
    const deltaY = currentY - touchStartY;

    // Visual feedback - translate the element
    dragElement.style.transform = `translateY(${deltaY}px)`;
    dragElement.style.opacity = '0.8';
    dragElement.style.zIndex = '1000';

    // Find which item we're over
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const listItem = elementBelow?.closest('[data-drag-id]');

    if (listItem && listItem !== dragElement) {
      const targetId = listItem.getAttribute('data-drag-id');
      if (targetId && targetId !== draggedItem) {
        draggedOverItem = targetId;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!draggedItem || !dragElement) return;

    // Reset visual state
    dragElement.style.transform = '';
    dragElement.style.opacity = '';
    dragElement.style.zIndex = '';

    // Perform the reorder if we have a target
    if (draggedOverItem && draggedItem !== draggedOverItem) {
      onReorder(draggedItem, draggedOverItem);
    }

    // Clean up
    dragElement.removeEventListener('touchmove', handleTouchMove);
    dragElement.removeEventListener('touchend', handleTouchEnd);

    draggedItem = null;
    draggedOverItem = null;
    dragElement = null;
    isDragging = false;

    // Also clean up any drag preview that might exist
    cleanupDragPreview();
  };

  // Create derived state outside of return
  const derivedDraggedItem = $derived(draggedItem);
  const derivedDraggedOverItem = $derived(draggedOverItem);
  const derivedIsDragging = $derived(isDragging);

  // Clean up on destroy
  onDestroy(() => {
    cleanupDragPreview();
  });

  return {
    // State
    get draggedItem() {
      return derivedDraggedItem;
    },
    get draggedOverItem() {
      return derivedDraggedOverItem;
    },
    get isDragging() {
      return derivedIsDragging;
    },

    // Handlers
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,

    // Utilities
    cleanupDragPreview
  };
}
