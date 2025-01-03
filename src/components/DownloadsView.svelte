<script lang="ts">
  import { downloadStore, type Download } from '../store/downloadsStore';
  import Icon from '@iconify/svelte';
  import { toast } from '../lib/toast';
  import { getCollection } from 'astro:content';
  import type { Post } from '../content/config';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

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

<div class="max-w-6xl mx-auto p-4">
  {#if uniqueDownloads.length === 0}
    <div class="text-center py-12 animate-fadeIn bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl">
      <Icon icon="material-symbols:download" 
            class="w-24 h-24 mx-auto text-[var(--primary)] opacity-40 animate-bounce"/>
      <p class="mt-6 text-gray-600 dark:text-gray-300 text-xl font-medium">
        No downloads available
      </p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each uniqueDownloads as download (getUniqueKey(download))}
        <div class="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl 
                    overflow-hidden transform transition-all duration-300 hover:scale-[1.01] 
                    border border-gray-100/20 dark:border-gray-700/20"
             in:fade={{ duration: 300, delay: 200 }}>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 gap-4">
            <div class="flex-1">
              <h3 class="font-medium text-xl text-gray-800 dark:text-gray-100 mb-2">
                {download.title}
              </h3>
              <div class="space-y-3">
                <p class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Icon icon="mdi:calendar" class="w-4 h-4 text-[var(--primary)]" />
                  {new Date(download.purchaseDate).toLocaleDateString()}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Icon icon="mdi:download-circle" class="w-4 h-4 text-[var(--primary)]" />
                  <span>{download.maxDownloads - download.downloads} downloads remaining</span>
                </p>
              </div>
            </div>
            
            <button
              class="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 
                     bg-[var(--primary)] text-white 
                     rounded-xl font-semibold transition-all duration-300 
                     hover:shadow-lg hover:-translate-y-1
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              on:click={() => handleDownload(download)}
              disabled={download.downloads >= download.maxDownloads}
              data-slug={download.slug}
            >
              <Icon icon="material-symbols:download" 
                    class="w-5 h-5 transition-transform group-hover:-translate-y-1" />
              <span>Download</span>
            </button>
          </div>
          
          <div class="h-2 bg-gray-100 dark:bg-gray-700">
            <div class="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-darker)] 
                        transition-all duration-500 ease-out"
                 style="width: {(download.downloads / download.maxDownloads) * 100}%" />
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
</style>
