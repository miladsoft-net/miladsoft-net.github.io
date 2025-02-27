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

  let mounted = false;
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
    mounted = true;
    const init = async () => {
      if (typeof window !== "undefined") {
        await Promise.all([loadKeys(), loadRelays()]);
        startPolling();
      }
    };
    init();
  });

  onDestroy(() => {
    if (mounted) {
      stopPolling();
      closeAllConnections();
    }
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

  function connectToRelay(relayUrl: string): WebSocket | null {
    if (!mounted || typeof window === "undefined") return null;

    if (activeConnections.has(relayUrl)) {
      return activeConnections.get(relayUrl) as WebSocket;
    }
    try {
      const socket = new WebSocket(relayUrl);
      socket.addEventListener("message", handleSocketMessage);
      activeConnections.set(relayUrl, socket);
      return socket;
    } catch (error) {
      console.error(`Failed to connect to relay ${relayUrl}:`, error);
      return null;
    }
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

{#if mounted}
  <div class="container">
    <div class="post-results grid grid-cols-1 gap-8">
      {#each posts as post}
        {@const project = keys.find((p) => p.nostrPubKey === post.pubkey)}
        {@const metadata = project?.metadata || {}}
        <div class="post-card">
          <div class="post-header">
            <img
              src={metadata.picture || "./assets/default-avatar.png"}
              alt={`Profile picture of ${metadata.name || "user"}`}
              class="profile-image"
              on:error={(e) => {
                const target = e.target as HTMLImageElement;
                if (target) target.src = "./assets/default-avatar.png";
              }}
            />
            <div class="author-info">
              <div class="author" data-pubkey={post.pubkey}>
                {metadata.name || prettyFormatKey(post.pubkey)}
              </div>
              {#if metadata.nip05}
                <div class="nip05">
                  {metadata.nip05}
                </div>
              {/if}
            </div>
          </div>
          <div class="post-content">
            {@html parseContent(post.content)}
          </div>
          <div class="post-footer">
            Created At: {dateToString(post.created_at)}
          </div>
        </div>
      {/each}
    </div>
    {#if posts.length > 0}
      <button on:click={loadMorePosts} class="load-more"> Load More </button>
    {/if}
  </div>
{:else}
  <div class="container">
    <div class="loading-state">Loading...</div>
  </div>
{/if}

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .post-card {
    background: var(--card-bg, #ffffff);
    border-radius: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    transition: all 0.3s ease;
    border: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  }

  :global(.dark) .post-card {
    background: var(--card-bg-dark, #1a1a1a);
    border-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .post-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .post-card:hover {
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
  }

  .post-header {
    display: flex;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
    background: var(--header-bg, rgba(255, 255, 255, 0.05));
  }

  :global(.dark) .post-header {
    border-bottom-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
    background: var(--header-bg-dark, rgba(0, 0, 0, 0.2));
  }

  .profile-image {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    margin-right: 1rem;
    object-fit: cover;
    border: 2px solid var(--primary);
  }

  .author-info {
    flex: 1;
  }

  .author {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-color, #1a1a1a);
    margin-bottom: 0.25rem;
  }

  :global(.dark) .author {
    color: var(--text-color-dark, #ffffff);
  }

  .nip05 {
    font-size: 0.9rem;
    color: var(--text-secondary, #666666);
  }

  :global(.dark) .nip05 {
    color: var(--text-secondary-dark, #a0a0a0);
  }

  .post-content {
    padding: 1.5rem;
    color: var(--text-color, #1a1a1a);
    font-size: 1rem;
    line-height: 1.6;
  }

  :global(.dark) .post-content {
    color: var(--text-color-dark, #ffffff);
  }

  .post-content :global(img) {
    max-width: 100%;
    height: auto;
    border-radius: 12px;
    margin: 1rem 0;
  }

  .post-content :global(video) {
    max-width: 100%;
    border-radius: 12px;
    margin: 1rem 0;
  }

  .post-content :global(a) {
    color: var(--link-color, var(--primary));
    text-decoration: none;
    word-break: break-word;
  }

  :global(.dark) .post-content :global(a) {
    color: var(--link-color-dark, var(--primary-light, #60a5fa));
  }

  .post-footer {
    padding: 1rem 1.5rem;
    background: var(--footer-bg, rgba(0, 0, 0, 0.02));
    color: var(--text-secondary, #666666);
    font-size: 0.9rem;
    border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.1));
  }

  :global(.dark) .post-footer {
    background: var(--footer-bg-dark, rgba(255, 255, 255, 0.02));
    color: var(--text-secondary-dark, #a0a0a0);
    border-top-color: var(--border-color-dark, rgba(255, 255, 255, 0.1));
  }

  .load-more {
    display: block;
    width: 200px;
    margin: 2rem auto;
    padding: 0.8rem 1.5rem;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .load-more:hover {
    transform: translateY(-1px);
    background: var(--primary-dark, var(--primary));
    opacity: 0.9;
  }

  :global(.dark) .load-more {
    background: var(--primary-dark, var(--primary));
  }

  :global(.dark) .load-more:hover {
    background: var(--primary-light, var(--primary));
  }

  .loading-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-color, #1a1a1a);
  }

  :global(.dark) .loading-state {
    color: var(--text-color-dark, #ffffff);
  }

  @media (max-width: 640px) {
    .container {
      padding: 10px;
    }

    .post-card {
      border-radius: 12px;
    }

    .post-header {
      padding: 1rem;
    }

    .profile-image {
      width: 50px;
      height: 50px;
    }

    .post-content {
      padding: 1rem;
    }
  }
</style>
