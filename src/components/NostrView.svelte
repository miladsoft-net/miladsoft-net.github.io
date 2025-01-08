<script lang="ts">
  import { onMount } from 'svelte';

  type Post = { pubkey: string, content: string, created_at: number, kind: number };
  type Key = { nostrPubKey: string, metadata?: { picture?: string, name?: string, nip05?: string } };

  let posts: Post[] = [];
  let keys: Key[] = [];
  let relayUrls: string[] = [];
  let postsToLoad = 10;
  let currentPage = 1;
  const loadedPosts = new Set<string>();

  onMount(() => {
    const init = async () => {
      await Promise.all([loadKeys(), loadRelays()]);
    };
    init();
  });

  async function loadKeys() {
    try {
      const response = await fetch('/nostr/keys.json');
      keys = await response.json();
      fetchAllPosts();
    } catch (error) {
      console.error('Error loading keys:', error);
    }
  }

  async function loadRelays() {
    try {
      const response = await fetch('/nostr/relays.json');
      const data = await response.json();
      relayUrls = data.relays;
      fetchAllPosts();
    } catch (error) {
      console.error('Error loading relays:', error);
    }
  }

  function fetchAllPosts() {
    if (keys.length && relayUrls.length) {
      keys.forEach((project) => {
        fetchPosts(project.nostrPubKey, Date.now() / 1000, postsToLoad);
      });
    }
  }

  function fetchPosts(pubkey: string, until: number, limit: number) {
    relayUrls.forEach((relayUrl) => {
      const socket = new WebSocket(relayUrl);
      socket.addEventListener('open', () => {
        socket.send(JSON.stringify(["REQ", `metadata-${pubkey}`, { kinds: [0], authors: [pubkey] }]));
        socket.send(JSON.stringify(["REQ", `posts-${pubkey}`, { kinds: [1], authors: [pubkey], until, limit }]));
      });
      socket.addEventListener('message', handleSocketMessage);
    });
  }

  function handleSocketMessage(event: MessageEvent) {
    try {
      const [type, subId, eventData] = JSON.parse(event.data);
      if (type === 'EVENT') {
        if (eventData.kind === 0) {
          handleMetadataEvent(eventData.pubkey, eventData.content);
        } else if (eventData.kind === 1 && !loadedPosts.has(eventData.id)) {
          loadedPosts.add(eventData.id);
          posts = [...posts, eventData].sort((a, b) => b.created_at - a.created_at);
        }
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }

  function handleMetadataEvent(pubkey: string, content: string) {
    try {
      const metadata = JSON.parse(content);
      const project = keys.find((p) => p.nostrPubKey === pubkey);
      if (project) {
        project.metadata = { ...metadata, picture: formatPicture(metadata.picture) };
        posts = [...posts];
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }
  }

  function formatPicture(picture?: string): string {
    if (picture && picture.startsWith('data:image')) {
      return picture;
    } else if (picture && !picture.startsWith('http')) {
      return '/nostr/default-avatar.png';
    }
    return picture || '/nostr/default-avatar.png';
  }

  function loadMorePosts() {
    currentPage++;
    keys.forEach((project) => {
      fetchPosts(project.nostrPubKey, Date.now() / 1000, postsToLoad * currentPage);
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
  <div class="post-results">
    {#each posts as post}
      {@const project = keys.find(p => p.nostrPubKey === post.pubkey)}
      {@const metadata = project?.metadata || {}}
      <div class="post-card" data-pubkey={post.pubkey}>
        <div class="post-header">
          <img
            src={metadata.picture || './assets/default-avatar.png'}
            alt={`Profile picture of ${metadata.name || 'user'}`}
            class="profile-image"
            on:error={(e) => { const target = e.target as HTMLImageElement; if (target) target.src = './assets/default-avatar.png'; }}
          />
          <div class="author-info">
            <div class="author" data-pubkey={post.pubkey}>
              {metadata.name || prettyFormatKey(post.pubkey)}
            </div>
            {#if metadata.nip05}
              <div class="nip05">{metadata.nip05}</div>
            {/if}
          </div>
        </div>
        <div class="post-content">
          {@html parseContent(post.content)}
        </div>
        <div class="post-footer">Created At: {dateToString(post.created_at)}</div>
      </div>
    {/each}
  </div>
  <button on:click={loadMorePosts} class="load-more">Load More</button>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }

  .post-card {
    border: 1px solid #ddd;
    margin-bottom: 20px;
    padding: 15px;
    border-radius: 8px;
  }

  .post-header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .profile-image {
    width: 50px;
    height: 50px;
    border-radius: 25px;
    margin-right: 10px;
  }

  .author-info {
    display: flex;
    flex-direction: column;
  }

  .nip05 {
    font-size: 0.8em;
    color: #666;
  }

  .post-footer {
    margin-top: 10px;
    font-size: 0.8em;
    color: #666;
  }

  .load-more {
    display: block;
    width: 100%;
    padding: 10px;
    margin-top: 20px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  .load-more:hover {
    background-color: #0056b3;
  }
</style>
