<script lang="ts">
  import { downloadStore } from '../store/downloadStore';
  import { navBarConfig } from '../config';

  $: showDownloads = $downloadStore.downloads.length > 0;
  
  // Add Downloads link to navigation if there are downloads
  $: links = showDownloads ? 
    [...navBarConfig.links, { name: 'Downloads', url: '/downloads/' }] : 
    navBarConfig.links;
</script>

// ...rest of the NavBar component code using the modified links array
