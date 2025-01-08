document.addEventListener('DOMContentLoaded', () => {
    loadkeys();
    loadRelays();
    window.addEventListener('scroll', handleScroll);
});

let keys = [];
let relayUrls = [];
let metadataFetched = {};

function loadkeys() {
    fetch('keys.json')
        .then(response => response.json())
        .then(data => {
            keys = data;
            fetchAllPosts();
        })
        .catch(error => console.error('Error loading keys:', error));
}

function loadRelays() {
    fetch('relays.json')
        .then(response => response.json())
        .then(data => {
            relayUrls = data.relays;
            fetchAllPosts();
        })
        .catch(error => console.error('Error loading relays:', error));
}

function fetchAllPosts() {
    keys.forEach(project => {
        fetchPosts(project.nostrPubKey, Date.now() / 1000);
    });
}

function fetchPosts(pubkey, until) {
    relayUrls.forEach(relayUrl => {
        const socket = new WebSocket(relayUrl);

        socket.addEventListener('open', () => {
            // Send metadata request first
            const metadataFilter = {
                "kinds": [0],
                "authors": [pubkey]
            };
            socket.send(JSON.stringify([
                "REQ",
                `metadata-${pubkey}`,
                metadataFilter
            ]));

            // Then send posts request
            const postFilter = { 
                "kinds": [1],
                "authors": [pubkey], 
                "until": until, 
                "limit": 10 
            };
            socket.send(JSON.stringify([
                "REQ",
                `posts-${pubkey}`,
                postFilter
            ]));
        });

        socket.addEventListener('message', async event => {
            try {
                const [type, subId, eventData] = JSON.parse(event.data);
                if (type === 'EVENT') {
                    if (eventData.kind === 0) {
                        // Handle metadata event
                        const metadata = JSON.parse(eventData.content);
                        const project = keys.find(p => p.nostrPubKey === eventData.pubkey);
                        if (project) {
                            project.metadata = {
                                name: metadata.name || '',
                                picture: metadata.picture || 'default-avatar.png',
                                about: metadata.about || '',
                                nip05: metadata.nip05 || ''
                            };
                            updateExistingPosts(eventData.pubkey, project.metadata);
                        }
                    } else if (eventData.kind === 1) {
                        // Handle post event
                        displayPost(eventData);
                    }
                }
            } catch (error) {
                console.error('Error processing event:', error);
            }
        });

        socket.addEventListener('error', error => {
            console.error('WebSocket error:', error);
        });

        socket.addEventListener('close', () => {
            console.log("Disconnected from relay:", relayUrl);
        });
    });
}

function handleMetadataEvent(pubkey, content) {
    try {
        const metadata = JSON.parse(content);
        const project = keys.find(project => project.nostrPubKey === pubkey);
        if (project) {
            // Parse picture URL from metadata
            let picture = metadata.picture || '';
            // Handle base64 images
            if (picture.startsWith('data:image')) {
                picture = picture;
            } else if (!picture.startsWith('http')) {
                picture = 'default-avatar.png';
            }
            project.metadata = {
                ...metadata,
                picture: picture
            };
            // Update existing posts with new metadata
            updateExistingPosts(pubkey, project.metadata);
        }
    } catch (error) {
        console.error('Error parsing metadata:', error);
    }
}

function updateExistingPosts(pubkey, metadata) {
    const posts = document.querySelectorAll('.post-card');
    posts.forEach(post => {
        const authorPubkey = post.querySelector('.author').dataset.pubkey;
        if (authorPubkey === pubkey) {
            const profileImg = post.querySelector('.post-header img');
            const authorName = post.querySelector('.author');
            if (profileImg) profileImg.src = metadata.picture || 'default-avatar.png';
            if (authorName) authorName.textContent = metadata.name || prettyFormatKey(pubkey);
        }
    });
}

function displayPost(post) {
    const postContainer = document.getElementById('post_results');
    const project = keys.find(p => p.nostrPubKey === post.pubkey);
    const metadata = project && project.metadata ? project.metadata : {};

    const postDiv = document.createElement('div');
    postDiv.classList.add('post-card');
    postDiv.dataset.pubkey = post.pubkey;
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${metadata.picture || 'default-avatar.png'}" 
                 alt="Profile Picture"
                 onerror="this.src='default-avatar.png'"
                 class="profile-image"
            >
            <div class="author-info">
                <div class="author" data-pubkey="${post.pubkey}">
                    ${metadata.name || prettyFormatKey(post.pubkey)}
                </div>
                ${metadata.nip05 ? `<div class="nip05">${metadata.nip05}</div>` : ''}
            </div>
        </div>
        <div class="post-content">${parseContent(post.content)}</div>
        <div class="post-footer">Created At: ${dateToString(post.created_at)}</div>
    `;
    postContainer.appendChild(postDiv);
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

function handleScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
        const lastPost = document.querySelector('.post-card:last-child');
        if (lastPost) {
            const lastTimestamp = new Date(lastPost.querySelector('.post-footer').textContent.split('Created At: ')[1]).getTime() / 1000;
            keys.forEach(project => {
                fetchPosts(project.nostrPubKey, lastTimestamp);
            });
        }
    }
}

function dateToString(unixTimestamp) {
    return new Date(unixTimestamp * 1000).toLocaleString();
}

function prettyFormatKey(key) {
    return key.slice(0, 4) + "..." + key.slice(-4);
}
