<script lang="ts">
  import { io } from 'socket.io-client';
  import slugify from 'slugify';
  import { onMount } from 'svelte';

  let { data } = $props();
  const user = data.user; // Current user object, e.g., { id, name }
  const sanitizedId = slugify(data.gameSession.id, { lower: true, strict: true, replacement: '' });

  let cursors = $state({}); // Track cursor positions of all users

  onMount(() => {
    const socket = io(`ws${location.origin.slice(4)}/gameSession/${sanitizedId}`, {
      reconnectionDelayMax: 10000
    });

    // Emit cursor position on mouse movement
    const handleMouseMove = (event: MouseEvent) => {
      const position = { x: event.clientX, y: event.clientY };
      socket.emit('cursorMove', { user, position });
    };

    // Listen for cursor updates from other users
    socket.on('cursorUpdate', (data) => {
      cursors = { ...cursors, [data.user.id]: data };
    });

    // Remove the cursor when a user disconnects
    socket.on('userDisconnect', (userId) => {
      const updatedCursors = { ...cursors };
      delete updatedCursors[userId];
      cursors = updatedCursors;
    });

    socket.on('connect', () => {
      console.log(`Connected to gameSession ${sanitizedId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Disconnected from gameSession ${sanitizedId}`);
      cursors = {};
    });

    // Add mousemove event listener
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      socket.disconnect();
    };
  });
  const getRandomColor = (): string => {
    return `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, '0')}`;
  };
  const randomColor = getRandomColor();
</script>

<h1>Game Session: {sanitizedId}</h1>

<!-- Render cursors for all users -->
<div>
  {#each Object.values(cursors) as { user, position }}
    <div
      class="cursor"
      style={`left: ${position.x}px; top: ${position.y}px; transform: translate(-50%, -50%); background-color: ${randomColor}`}
    >
      {user.email}
    </div>
  {/each}
</div>

<style>
  .cursor {
    position: fixed;
    width: 100px;
    height: 2rem;
    line-height: 2rem;
    pointer-events: none;
    background: red;
    color: black;
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 12px;
  }
</style>
