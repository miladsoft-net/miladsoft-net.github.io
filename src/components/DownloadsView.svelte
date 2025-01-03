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

<div class="max-w-4xl mx-auto p-4">
  {#if uniqueDownloads.length === 0}
     <div class="flex flex-col items-center justify-center h-[300px]" in:fade>
        <Icon icon="material-symbols:download" 
              class="text-gray-400 dark:text-gray-500 w-20 h-20 animate-bounce" />
        <p class="mt-6 text-gray-500 dark:text-gray-400 text-lg font-medium">
            No downloads available
        </p>
      </div>

  {:else}
  <div class="flex flex-col gap-4" in:fade>
    {#each uniqueDownloads as download (getUniqueKey(download))}
        <div class="bg-white/90 dark:bg-gray-800/90 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700"
             in:fade={{ duration: 200 }}>
          <div class="p-5">
            <!-- Title with Link -->
            <a href={`/posts/${download.slug}/`} 
               class="inline-block text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-[var(--primary)] transition-colors mb-3">
              {download.title}
            </a>
            
            <!-- File Information Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <!-- Purchase Date -->
              <div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Icon icon="mdi:calendar" class="w-4 h-4" />
                  <span>Purchased</span>
                </div>
                <div class="mt-1 font-medium text-gray-700 dark:text-gray-300">
                  {new Date(download.purchaseDate).toLocaleDateString()}
                </div>
              </div>
              
              <!-- Price -->
              <div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Icon icon="mdi:currency-usd" class="w-4 h-4" />
                  <span>Price</span>
                </div>
                <div class="mt-1 font-medium text-gray-700 dark:text-gray-300">
                  ${download.price}
                </div>
              </div>
              
              <!-- Download Count -->
              <div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Icon icon="mdi:download-circle" class="w-4 h-4" />
                  <span>Downloads Used</span>
                </div>
                <div class="mt-1 font-medium text-gray-700 dark:text-gray-300">
                  {download.downloads} of {download.maxDownloads}
                </div>
              </div>
              
              <!-- Expiry Date (30 days from purchase) -->
              <div>
                <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Icon icon="mdi:clock-outline" class="w-4 h-4" />
                  <span>Expires</span>
                </div>
                <div class="mt-1 font-medium text-gray-700 dark:text-gray-300">
                  {new Date(new Date(download.purchaseDate).getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                </div>
              </div>
            </div>

            <!-- Download Button -->
            <div class="mt-4 flex justify-end">
              <button
                class="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-md
                       transition-all duration-200 hover:opacity-90
                       disabled:opacity-50 disabled:cursor-not-allowed"
                on:click={() => handleDownload(download)}
                disabled={download.downloads >= download.maxDownloads}
                data-slug={download.slug}
              >
                <Icon icon="material-symbols:download" class="w-5 h-5" />
                <span>Download</span>
              </button>
            </div>
          </div>
          
          <!-- Progress Bar -->
          <div class="h-1 bg-gray-100 dark:bg-gray-700">
            <div class="h-full bg-[var(--primary)] transition-all duration-300"
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
