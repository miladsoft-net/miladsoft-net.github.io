<script lang="ts">
  import { downloadStore, type Download } from '../store/downloadsStore';
  import Icon from '@iconify/svelte';
  import { toast } from '../lib/toast';

  // Get downloads directly from the store subscription
  $: downloads = $downloadStore;

  async function handleDownload(download: Download) {
    try {
      if (download.downloads >= download.maxDownloads) {
        toast.error('Maximum download limit reached');
        return;
      }

      const response = await fetch(`/api/download/${download.slug}?token=${download.token}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${download.title}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Increment download count
      downloadStore.incrementDownloadCount(download.slug);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  }
</script>

<div class="max-w-4xl mx-auto p-4">
  {#if downloads.length === 0}
    <div class="text-center py-8">
      <Icon icon="material-symbols:download" class="w-16 h-16 mx-auto text-gray-400"/>
      <p class="mt-4 text-gray-600">No downloads available</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each downloads as download (download.slug)}
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div class="p-6">
            <h3 class="font-medium text-lg text-gray-900 dark:text-white mb-3">
              {download.title}
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Purchased: {new Date(download.purchaseDate).toLocaleDateString()}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Downloads remaining: {download.maxDownloads - download.downloads}
            </p>
            <button
              class="mt-4 inline-flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              on:click={() => handleDownload(download)}
              disabled={download.downloads >= download.maxDownloads}
            >
              <Icon icon="material-symbols:download" class="w-5 h-5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
