<script>
  import { onMount } from 'svelte';

  let posts = [];
  let keys = [];
  let relayUrls = [];
  let metadataFetched = {};
  let postsToLoad = 10;

  onMount(async () => {
    await Promise.all([loadkeys(), loadRelays()]);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });

  async function loadkeys() {
    const response = await fetch('/nostr/keys.json');
    keys = await response.json();
    fetchAllPosts();
  }

  async function loadRelays() {
    const response = await fetch('/nostr/relays.json');
    const data = await response.json();
    relayUrls = data.relays;
    fetchAllPosts();
  }

  function fetchAllPosts() {
    if (keys.length && relayUrls.length) {
      keys.forEach(project => {
        fetchPosts(project.nostrPubKey, Date.now() / 1000, postsToLoad);
      });
    }
  }

  function fetchPosts(pubkey, until, limit) {
    relayUrls.forEach(relayUrl => {
      const socket = new WebSocket(relayUrl);

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify([
          "REQ",
          `metadata-${pubkey}`,
          {
            "kinds": [0],
            "authors": [pubkey]
          }
        ]));

        socket.send(JSON.stringify([
          "REQ",
          `posts-${pubkey}`,
          {
            "kinds": [1],
            "authors": [pubkey],
            "until": until,
            "limit": limit
          }
        ]));
      });

      socket.addEventListener('message', async event => {
        try {
          const [type, subId, eventData] = JSON.parse(event.data);
          if (type === 'EVENT') {
            if (eventData.kind === 0) {
              handleMetadataEvent(eventData.pubkey, eventData.content);
            } else if (eventData.kind === 1) {
              posts = [...posts, eventData].sort((a, b) => b.created_at - a.created_at);
            }
          }
        } catch (error) {
          console.error('Error processing event:', error);
        }
      });
    });
  }

  function handleMetadataEvent(pubkey, content) {
    try {
      const metadata = JSON.parse(content);
      const project = keys.find(p => p.nostrPubKey === pubkey);
      if (project) {
        let picture = metadata.picture || '';
        if (picture.startsWith('data:image')) {
          picture = picture;
        } else if (!picture.startsWith('http')) {
          picture = '/nostr/default-avatar.png';
        }
        project.metadata = { ...metadata, picture };
        posts = [...posts]; // trigger re-render
      }
    } catch (error) {
      console.error('Error parsing metadata:', error);
    }
  }

  function handleScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
      //loadMorePosts();
    }
  }

  function loadMorePosts() {
    if (posts.length > 0) {
      const lastTimestamp = posts[posts.length - 1].created_at;
      keys.forEach(project => {
        fetchPosts(project.nostrPubKey, lastTimestamp, postsToLoad);
      });
    }
  }

  function parseContent(content) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, url => {
      if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) {
        return `<img src="${url}" alt="Image" style="max-width: 100%; height: auto;">`;
      } else if (url.match(/\.(mp4|webm|ogg)$/) != null) {
        return `<video controls style="max-width: 100%; height: auto;">
                    <source src="${url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>`;
      } else {
        return `<a href="${url}" target="_blank">${url}</a>`;
      }
    });
  }

  function prettyFormatKey(key) {
    return key.slice(0, 4) + "..." + key.slice(-4);
  }

  function dateToString(unixTimestamp) {
    return new Date(unixTimestamp * 1000).toLocaleString();
  }
</script>

<div class="container">
  <h2>Angor Posts on Nostr</h2>
  <div class="post-results">
    {#each posts as post}
      {@const project = keys.find(p => p.nostrPubKey === post.pubkey)}
      {@const metadata = project?.metadata || {}}
      <div class="post-card" data-pubkey={post.pubkey}>
        <div class="post-header">
          <img
            src={metadata.picture || '/nostr/default-avatar.png'}
            alt="Profile Picture"
            class="profile-image"
            on:error={(e) => e.target.src = '/nostr/default-avatar.png'}
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
