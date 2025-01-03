<script lang="ts">
  import { toast } from '../lib/toast';
  import { fly } from 'svelte/transition';

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };
</script>

<div class="fixed top-4 right-4 z-50">
  {#each $toast as notification (notification.id)}
    <div
      transition:fly={{ x: 100, duration: 300 }}
      class="mb-2 p-4 text-white rounded-lg shadow-lg {colors[notification.type]}"
    >
      {notification.message}
    </div>
  {/each}
</div>
