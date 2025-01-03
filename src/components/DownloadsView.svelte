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
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each $downloadStore.downloads as download}
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ease-in-out hover:-translate-y-1">
          <div class="p-6">
            <h3 class="font-medium text-lg text-gray-900 dark:text-white mb-3">{download.productTitle}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Purchased on {formatDate(download.date)}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Price: ${download.price}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end items-center">
            <a
              href={download.downloadUrl}
              class="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm hover:shadow-md active:scale-95"
              download
            >
              <Icon icon="material-symbols:download" class="w-5 h-5" />
              <span>Download</span>
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
