<script lang="ts">
  import { downloadStore, type Download } from '../store/downloadsStore';
  import Icon from '@iconify/svelte';
  import { toast } from '../lib/toast';
  import { getCollection } from 'astro:content';
  import type { Post } from '../content/config';
  import { onMount } from 'svelte';

  // Get downloads directly from the store subscription
  $: downloads = $downloadStore;
  let posts: Post[] = [];

  // Create a unique key for each download
  function getUniqueKey(download: Download) {
    return `${download.slug}-${download.purchaseDate}-${download.token}`;
  }

  // Filter out duplicates based on slug
  $: uniqueDownloads = downloads.reduce((acc, current) => {
    const exists = acc.find(item => item.slug === current.slug);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, [] as Download[]);

  // Fetch all posts on component mount
  onMount(async () => {
    try {
      const allPosts = await getCollection('posts');
      posts = allPosts;
      console.log('Loaded posts:', posts.length); // Debug log
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  });

  // Find post by slug
  function findPost(slug: string) {
    const post = posts.find(p => p.slug === slug);
    console.log('Finding post for slug:', slug, 'Found:', post?.data?.downloadUrl); // Debug log
    return post;
  }

  async function handleDownload(download: Download) {
    const button = document.querySelector(`button[data-slug="${download.slug}"]`) as HTMLButtonElement;
    if (button) button.disabled = true;

    try {
      if (download.downloads >= download.maxDownloads) {
        toast.error('Maximum download limit reached');
        return;
      }

      // Find corresponding post
      const post = findPost(download.slug);
      if (!post?.data?.downloadUrl) {
        throw new Error('Download URL not found');
      }

      // Use direct download URL with token
      const downloadUrl = `${post.data.downloadUrl}?token=${download.token}`;
      console.log('Download URL:', downloadUrl); // Debug log

      // Create download link
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = post.data.title || download.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Increment download count
      downloadStore.incrementDownloadCount(download.slug);
      toast.success('Download started');

    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file. Please try again.');
    } finally {
      if (button) button.disabled = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto p-4">
  {#if uniqueDownloads.length === 0}
    <div class="text-center py-8">
      <Icon icon="material-symbols:download" class="w-16 h-16 mx-auto text-gray-400"/>
      <p class="mt-4 text-gray-600">No downloads available</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {#each uniqueDownloads as download (getUniqueKey(download))}
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div class="p-6">
            <h3 class="font-medium text-lg text-gray-900 dark:text-white mb-3">
              {download.title}
              <!-- Debug info -->
              <span class="text-xs text-gray-500">({download.slug})</span>
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
              data-slug={download.slug}
            >
              <Icon icon="material-symbols:download" class="w-5 h-5" />
              <span>Download ({findPost(download.slug) ? 'Found' : 'Not Found'})</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
