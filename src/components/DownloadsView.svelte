<script lang="ts">
  import { downloadStore, type Download } from "../store/downloadsStore";
  import Icon from "@iconify/svelte";
  import { toast } from "../lib/toast";
  import { getCollection } from "astro:content";
  import type { Post } from "../content/config";
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { saveExportFile, handleImportFile } from "../utils/downloadManager";

  const ICONS = {
    download: "fluent:arrow-download-24-filled",
    calendar: "fluent:calendar-28-filled",
    price: "fluent:money-24-filled",
    downloadCount: "fluent:arrow-download-28-filled",
    expire: "fluent:timer-24-filled",
    export: "fluent:share-24-filled",
    import: "fluent:arrow-import-24-filled",
    downloadTitle: "fluent:box-24-filled",
  };

  // Get downloads directly from the store subscription
  $: downloads = $downloadStore;
  let posts: Post[] = [];

  let isLoading = true;
  let isClient = false;
  let isHydrated = false;
  let mountedPosts: Post[] = [];

  onMount(async () => {
    isClient = true;
    try {
      const allPosts = await getCollection("posts");
      mountedPosts = allPosts;
     } catch (error) {
      console.error("Failed to fetch posts:", error);
    } finally {
      isLoading = false;
      isHydrated = true;
    }
  });

  // Create a unique key for each download
  function getUniqueKey(download: Download) {
    return `${download.slug}-${download.purchaseDate}-${download.token}`;
  }

  // Filter out duplicates based on slug
  $: uniqueDownloads = downloads.reduce((acc, current) => {
    const exists = acc.find((item) => item.slug === current.slug);
    if (!exists) {
      acc.push(current);
    }
    return acc;
  }, [] as Download[]);

  // Fetch all posts on component mount
  onMount(async () => {
    try {
      const allPosts = await getCollection("posts");
      posts = allPosts;
     } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  });

  // Find post by slug
  function findPost(slug: string) {
    const post = posts.find((p) => p.slug === slug);
    console.log(
      "Finding post for slug:",
      slug,
      "Found:",
      post?.data?.downloadUrl
    ); // Debug log
    return post;
  }

  async function handleDownload(download: Download) {
    const button = document.querySelector(
      `button[data-slug="${download.slug}"]`
    ) as HTMLButtonElement;
    if (button) button.disabled = true;

    try {
      if (download.downloads >= download.maxDownloads) {
        toast.error("Maximum download limit reached");
        return;
      }

      // Find corresponding post
      const post = findPost(download.slug);
      if (!post?.data?.downloadUrl) {
        throw new Error("Download URL not found");
      }

      // Use encrypted download URL
      const encryptedUrl = `${post.data.downloadUrl}?token=${download.token}&fmt=miladsoft`;

      const a = document.createElement("a");
      a.href = encryptedUrl;
      a.download = `${post.data.title || download.title}.miladsoft`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Increment download count
      downloadStore.incrementDownloadCount(download.slug);
      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file. Please try again.");
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function exportDownloads() {
    try {
      await saveExportFile(uniqueDownloads);
      toast.success("Downloads exported successfully");
    } catch (error) {
      toast.error("Failed to export downloads");
    }
  }

  async function importDownloads(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    try {
      const importedDownloads = await handleImportFile(input.files[0]);
      importedDownloads.forEach((download) => {
        if (!downloadStore.checkExistingDownload(download.slug)) {
          downloadStore.addDownload(download);
        }
      });
      toast.success("Downloads imported successfully");
    } catch (error) {
      toast.error("Failed to import downloads");
    } finally {
      input.value = ""; // Reset input
    }
  }

  function fly(
    arg0: HTMLDivElement,
    arg1: { y: number; duration: number }
  ): __sveltets_2_SvelteTransitionReturnType {
    throw new Error("Function not implemented.");
  }
</script>

{#if isLoading}
  <div class="flex justify-center items-center min-h-[200px]">
    <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary)]"></div>
  </div>
{:else if isHydrated}
  <div class="max-w-4xl mx-auto">
    <!-- Header with title and actions -->
    <div class="flex items-center justify-between mb-8 pb-4">
      <div class="flex items-center gap-2">
        <!-- <Icon icon={ICONS.downloadTitle} class="w-6 h-6 text-[var(--primary)]" /> -->
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          My Downloads
        </h1>
      </div>

      <div class="flex items-center gap-3">
        <input
          type="file"
          accept=".miladsoft"
          class="hidden"
          id="import-file"
          on:change={importDownloads}
        />
        <label
          for="import-file"
          class="flex items-center gap-2 px-3 py-1.5 text-sm btn-plain scale-animation rounded-lg h-11 font-bold cursor-pointer"
        >
          <Icon icon={ICONS.import} class="w-4 h-4" />
          <span>Import</span>
        </label>
        <button
          class="flex items-center gap-2 px-3 py-1.5 text-sm btn-plain scale-animation rounded-lg h-11 font-bold cursor-pointer"
          on:click={exportDownloads}
        >
          <Icon icon={ICONS.export} class="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>
    </div>

    {#if isLoading}
      <div class="flex justify-center items-center min-h-[200px]">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--primary)]"></div>
      </div>
    {:else if isClient}
      {#if $downloadStore.length === 0}
        <div class="flex flex-col items-center justify-center h-[300px]" in:fade>
          <Icon
            icon={ICONS.download}
            class="text-[var(--primary)] dark:text-[var(--primary)] w-20 h-20 animate-bounce"
          />
          <p class="mt-6 text-gray-500 dark:text-white/70 text-lg font-medium">
            No downloads available
          </p>
        </div>
      {:else}
        <div class="flex flex-col gap-4" in:fade>
          {#each uniqueDownloads as download (getUniqueKey(download))}
            <div
              class="flex flex-col p-4 bg-[var(--page-bg)] dark:bg-white/10 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300"
              in:fly={{ y: 20, duration: 300 }}
            >
              <div class="p-5">
                <!-- Title with Link -->
                <a
                  href={`/posts/${download.slug}/`}
                  class="inline-block text-lg font-medium text-gray-800 dark:text-gray-100 hover:text-[var(--primary)] dark:hover:text-[var(--primary)] transition-colors mb-3"
                >
                  {download.title}
                </a>

                <div
                  class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
                >
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-6 w-full">
                    <div class="space-y-1">
                      <div
                        class="flex items-center gap-2 text-[var(--primary)] dark:text-[var(--primary)]"
                      >
                        <Icon icon={ICONS.calendar} class="w-5 h-5 " />
                        <span class="font-medium">Purchased</span>
                      </div>
                      <div
                        class="text-base font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {new Date(download.purchaseDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div class="space-y-1">
                      <div
                        class="flex items-center gap-2 text-[var(--primary)] dark:text-[var(--primary)]"
                      >
                        <Icon icon={ICONS.price} class="w-5 h-5" />
                        <span class="font-medium">Price</span>
                      </div>
                      <div
                        class="text-base font-semibold text-gray-700 dark:text-gray-300"
                      >
                        ${download.price}
                      </div>
                    </div>

                    <div class="space-y-1">
                      <div
                        class="flex items-center gap-2 text-[var(--primary)] dark:text-[var(--primary)]"
                      >
                        <Icon icon={ICONS.downloadCount} class="w-5 h-5" />
                        <span class="font-medium">Downloads</span>
                      </div>
                      <div
                        class="text-base font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {download.downloads} / {download.maxDownloads}
                      </div>
                    </div>

                    <div class="space-y-1">
                      <div
                        class="flex items-center gap-2 text-[var(--primary)] dark:text-[var(--primary)]"
                      >
                        <Icon icon={ICONS.expire} class="w-5 h-5" />
                        <span class="font-medium">Expires</span>
                      </div>
                      <div
                        class="text-base font-semibold text-gray-700 dark:text-gray-300"
                      >
                        {new Date(
                          new Date(download.purchaseDate).getTime() +
                            30 * 24 * 60 * 60 * 1000
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div class="w-full sm:w-auto flex justify-center sm:justify-end">
                    <button
                      class="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] text-white font-semibold rounded-lg
                               transition-all duration-300 ease-in-out shadow-lg
                               hover:bg-opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed
                               w-full sm:w-auto"
                      on:click={() => handleDownload(download)}
                      disabled={download.downloads >= download.maxDownloads}
                      data-slug={download.slug}
                    >
                      <Icon icon={ICONS.download} class="w-6 h-6 sm:w-6 sm:h-6" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="h-1 bg-gray-100 dark:bg-white/10 rounded-b-xl">
                <div
                  class="h-full bg-[var(--primary)] transition-all duration-300"
                  style="width: {(download.downloads / download.maxDownloads) *
                    100}%"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out;
  }
</style>
