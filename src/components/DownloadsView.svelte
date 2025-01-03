<script lang="ts">
  import { downloadStore } from '../store/downloadStore';
  import Icon from '@iconify/svelte';

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }
</script>

<div class="max-w-4xl mx-auto p-4">
 
  {#if $downloadStore.downloads.length === 0}
    <div class="text-center py-8">
      <Icon icon="material-symbols:shopping-bag-outline" class="w-16 h-16 mx-auto text-gray-400"/>
      <p class="mt-4 text-gray-600 dark:text-gray-400">No downloads available</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each $downloadStore.downloads as download}
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div class="flex justify-between items-start">
            <div>
              <h3 class="font-medium">{download.productTitle}</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Purchased on {formatDate(download.date)}
              </p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                Price: ${download.price}
              </p>
            </div>
            <a
              href={download.downloadUrl}
              class="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              download
            >
              <Icon icon="material-symbols:download" class="w-5 h-5" />
              Download
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
