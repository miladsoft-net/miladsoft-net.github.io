<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  type Post = {
    pubkey: string;
    content: string;
    created_at: number;
    kind: number;
  };
  type Key = {
    nostrPubKey: string;
    metadata?: { picture?: string; name?: string; nip05?: string };
  };

  let posts: Post[] = [];
  let keys: Key[] = [];
  const activeConnections = new Map<string, WebSocket>();
  let relayUrls: string[] = [];
  let postsToLoad = 9;
  let currentPage = 1;
  const loadedPosts = new Set<string>();
  let pollingInterval: number;
  const POLLING_INTERVAL = 10000; // 10 seconds
  let lastFetchTime = Date.now() / 1000;

  onMount(() => {
    const init = async () => {
      await Promise.all([loadKeys(), loadRelays()]);
      startPolling();
    };
    init();
  });

  onDestroy(() => {
    stopPolling();
    closeAllConnections();
  });

  async function loadKeys() {
    try {
      const response = await fetch("/nostr/keys.json");
      keys = await response.json();
      fetchAllPosts();
    } catch (error) {
      console.error("Error loading keys:", error);
    }
  }

  async function loadRelays() {
    try {
      const response = await fetch("/nostr/relays.json");
      const data = await response.json();
      relayUrls = data.relays;
      fetchAllPosts();
    } catch (error) {
      console.error("Error loading relays:", error);
    }
  }

  function fetchAllPosts() {
    if (keys.length && relayUrls.length) {
      keys.forEach((project) => {
        fetchPosts(project.nostrPubKey, Date.now() / 1000, postsToLoad);
      });
    }
  }

  function startPolling() {
    pollingInterval = window.setInterval(() => {
      const currentTime = Date.now() / 1000;
      keys.forEach((project) => {
        fetchPosts(project.nostrPubKey, currentTime, postsToLoad, true);
      });
      lastFetchTime = currentTime;
    }, POLLING_INTERVAL);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  }

  function closeAllConnections() {
    // Close any existing WebSocket connections
    relayUrls.forEach((relayUrl) => {
      const socket = activeConnections.get(relayUrl);
      if (socket?.readyState === WebSocket.OPEN) {
        socket.close();
      }
    });
    activeConnections.clear();
  }

  function connectToRelay(relayUrl: string): WebSocket {
    if (activeConnections.has(relayUrl)) {
      return activeConnections.get(relayUrl) as WebSocket;
    }
    const socket = new WebSocket(relayUrl);
    socket.addEventListener("message", handleSocketMessage);
    activeConnections.set(relayUrl, socket);
    return socket;
  }

  function fetchPosts(
    pubkey: string,
    until: number,
    limit: number,
    isPolling = false
  ) {
    relayUrls.forEach((relayUrl) => {
      const socket = connectToRelay(relayUrl);
      if (!socket) return;

      if (socket.readyState === WebSocket.OPEN) {
        sendSubscriptions(socket, pubkey, until, limit, isPolling);
      } else {
        socket.addEventListener(
          "open",
          () => {
            sendSubscriptions(socket, pubkey, until, limit, isPolling);
          },
          { once: true }
        );
      }
    });
  }

  function sendSubscriptions(
    socket: WebSocket,
    pubkey: string,
    until: number,
    limit: number,
    isPolling: boolean
  ) {
    const since = isPolling ? lastFetchTime : undefined;
    const filters = {
      kinds: [1],
      authors: [pubkey],
      until,
      limit,
      ...(since ? { since } : {}),
    };

    socket.send(
      JSON.stringify(["REQ", `posts-${pubkey}-${Date.now()}`, filters])
    );

    // Only fetch metadata if not polling
    if (!isPolling) {
      socket.send(
        JSON.stringify([
          "REQ",
          `metadata-${pubkey}`,
          { kinds: [0], authors: [pubkey] },
        ])
      );
    }
  }

  function handleSocketMessage(event: MessageEvent) {
    try {
      const [type, subId, eventData] = JSON.parse(event.data);
      if (type === "EVENT") {
        if (eventData.kind === 0) {
          handleMetadataEvent(eventData.pubkey, eventData.content);
        } else if (eventData.kind === 1 && !loadedPosts.has(eventData.id)) {
          loadedPosts.add(eventData.id);
          // Add new post to the beginning of the array
          posts = [eventData, ...posts].sort(
            (a, b) => b.created_at - a.created_at
          );
        }
      }
    } catch (error) {
      console.error("Error processing event:", error);
    }
  }

  function handleMetadataEvent(pubkey: string, content: string) {
    try {
      const metadata = JSON.parse(content);
      const project = keys.find((p) => p.nostrPubKey === pubkey);
      if (project) {
        project.metadata = {
          ...metadata,
          picture: formatPicture(metadata.picture),
        };
        posts = [...posts];
      }
    } catch (error) {
      console.error("Error parsing metadata:", error);
    }
  }

  function formatPicture(picture?: string): string {
    if (picture && picture.startsWith("data:image")) {
      return picture;
    } else if (picture && !picture.startsWith("http")) {
      return "/nostr/default-avatar.png";
    }
    return picture || "/nostr/default-avatar.png";
  }

  function loadMorePosts() {
    currentPage++;
    keys.forEach((project) => {
      fetchPosts(
        project.nostrPubKey,
        Date.now() / 1000,
        postsToLoad * currentPage
      );
    });
  }

  function parseContent(content: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, (url) => {
      if (/\.(jpeg|jpg|gif|png)$/i.test(url)) {
        return `<img src="${url}" alt="Image" style="max-width: 100%; height: auto;">`;
      } else if (/\.(mp4|webm|ogg)$/i.test(url)) {
        return `<video controls style="max-width: 100%; height: auto;">
                  <source src="${url}" type="video/mp4">
                  Your browser does not support the video tag.
                </video>`;
      } else {
        return `<a href="${url}" target="_blank">${url}</a>`;
      }
    });
  }

  function prettyFormatKey(key: string): string {
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  function dateToString(unixTimestamp: number): string {
    return new Date(unixTimestamp * 1000).toLocaleString();
  }
</script>

<div class="container">
  <div
    class="post-results grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-6"
  >
    {#each posts as post}
      {@const project = keys.find((p) => p.nostrPubKey === post.pubkey)}
      {@const metadata = project?.metadata || {}}
      <div
        class="post-card bg-[var(--page-bg)] dark:bg-white/10 shadow-lg rounded-lg overflow-hidden"
      >
        <div class="post-header flex items-center p-4">
          <img
            src={metadata.picture || "./assets/default-avatar.png"}
            alt={`Profile picture of ${metadata.name || "user"}`}
            class="profile-image w-12 h-12 rounded-full mr-4"
            on:error={(e) => {
              const target = e.target as HTMLImageElement;
              if (target) target.src = "./assets/default-avatar.png";
            }}
          />
          <div class="author-info">
            <div
              class="author font-semibold text-lg text-gray-800 dark:text-gray-200"
              data-pubkey={post.pubkey}
            >
              {metadata.name || prettyFormatKey(post.pubkey)}
            </div>
            {#if metadata.nip05}
              <div class="nip05 text-sm text-gray-600 dark:text-gray-400">
                {metadata.nip05}
              </div>
            {/if}
          </div>
        </div>
        <div class="post-content p-4 text-gray-700 dark:text-gray-300">
          {@html parseContent(post.content)}
        </div>
        <div
          class="post-footer p-4 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700"
        >
          Created At: {dateToString(post.created_at)}
        </div>
      </div>
    {/each}
  </div>
  <button
    on:click={loadMorePosts}
    class="load-more mt-8 bg-[var(--primary)] text-white py-2 px-4 rounded-lg hover:bg-[var(--primary)] transition"
  >
    Load More
  </button>
</div>

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }

  .post-card {
    transition:
      transform 0.3s,
      box-shadow 0.3s;
  }

  .post-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }

  .profile-image {
    width: 50px;
    height: 50px;
    border-radius: 25px;
    margin-right: 10px;
  }

  .load-more {
    display: block;
    width: 100%;
    padding: 10px;
    margin-top: 20px;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
</style>
