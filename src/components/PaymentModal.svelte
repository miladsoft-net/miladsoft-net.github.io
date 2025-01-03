<script lang="ts">
  // Remove SvelteKit import
  // import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { portal } from '../utils/portal'; // Updated import
  import { fade, scale, blur } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import { downloadStore } from '../store/downloadStore';
  import { getCollection, type CollectionEntry } from 'astro:content';
  import { storeDownloadToken, getCurrentUserId } from '../services/downloadTokenService';

  const dispatch = createEventDispatcher();
  
  export let show = false;
  export let total: number;
  export let products: Array<{
    title: string;
    price: number;
    slug: string;
  }>;

  let selectedMethod = '';
  let bitcoinPrice = 0;
  let satoshis = 0;
  let invoice = '';
  let paymentResult = '';
  let isChecking = false;
  let verifyUrl = '';
  let isGeneratingInvoice = false;

  const paymentMethods = [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      description: 'Pay with Bitcoin',
      icon: 'cryptocurrency:btc',
      address: 'BITCOIN_WALLET_ADDRESS',
      network: 'Bitcoin Lightning Network'
    }
  ];

  onMount(async () => {
    await fetchBitcoinPrice();
    calculateSatoshis();
    setInterval(async () => {
      await fetchBitcoinPrice();
      calculateSatoshis();
    }, 60000); // Update every minute
  });

  async function fetchBitcoinPrice() {
    try {
      const response = await fetch('https://mempool.space/api/v1/prices');
      const data = await response.json();
      bitcoinPrice = data.USD; // Price in USD
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
    }
  }

  function calculateSatoshis() {
    if (bitcoinPrice > 0) {
      satoshis = (total / bitcoinPrice) * 100000000; // 1 BTC = 100,000,000 satoshis
    }
  }

  // Update the status messages to include emojis for better visibility
  async function generateInvoice() {
    isGeneratingInvoice = true;
    paymentResult = '';
    
    try {
      const response = await fetch(`https://api.getalby.com/lnurl/generate-invoice?ln=milad@getalby.com&amount=${satoshis*1000}`);
      const data = await response.json();
      
      if (!data.invoice || !data.invoice.pr) {
        throw new Error('Invalid response from API');
      }
      
      invoice = data.invoice.pr;
      verifyUrl = data.invoice.verify;
      startPaymentCheck();
    } catch (error) {
      console.error('Error generating invoice:', error);
      paymentResult = '❌ Error generating invoice. Please try again.';
    } finally {
      isGeneratingInvoice = false;
    }
  }

  function startPaymentCheck() {
    if (!verifyUrl) return;
    
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(verifyUrl);
        const data = await response.json();
        
        if (data.status === 'OK') {
          if (data.settled) {
            handleSuccessfulPayment();
            clearInterval(checkInterval);
          } else {
            paymentResult = '⏳ Waiting for payment...';
          }
        }
      } catch (error) {
        console.error('Error checking payment:', error);
        paymentResult = '❌ Error checking payment status';
      }
    }, 2000); // Check every 2 seconds

    // Cleanup interval after 10 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 600000);
  }

  interface ExtendedWindow extends Window {
    confetti: (options: any) => void;
  }

  async function handleSuccessfulPayment() {
    // Add confetti effect
    const confetti = document.createElement('script');
    confetti.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
    document.head.appendChild(confetti);
    
    confetti.onload = () => {
      (window as unknown as ExtendedWindow).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    };

    try {
      // Get all posts from content collection
      const allPosts = await getCollection('posts');
      
      // Add each product to download store
      for (const product of products) {
        // Find the corresponding post
        const post = allPosts.find((p: CollectionEntry<'posts'>) => p.slug === product.slug);
        
        if (!post) continue;

        // Generate a secure download token
        const downloadToken = generateSecureToken();

        // Store the download in downloadStore
        downloadStore.addDownload({
          productTitle: product.title,
          date: new Date().toISOString(),
          price: product.price,
          downloadUrl: `/api/download/${post.slug}?token=${downloadToken}`, // Secure download URL
          downloadToken, // Store token for verification
          slug: post.slug,
          purchased: true
        });

        // Store token in server/database for verification
        await storeDownloadToken({
          token: downloadToken,
          slug: post.slug,
          userId: getCurrentUserId(), // Implement this function
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          downloads: 0, // Initial download count
          maxDownloads: 3 // Maximum allowed downloads
        });
      }

      // Show success animation
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed inset-0 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 z-50';
      successMessage.innerHTML = `
        <div class="text-center p-8 transform scale-up">
          <div class="success-checkmark">
            <div class="check-icon">
              <span class="icon-line line-tip"></span>
              <span class="icon-line line-long"></span>
              <div class="icon-circle"></div>
              <div class="icon-fix"></div>
            </div>
          </div>
          <h2 class="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Payment Successful!</h2>
          <p class="text-lg text-gray-600 dark:text-gray-400 mb-4">Thank you for your purchase</p>
          <div class="animate-bounce">
            <p class="text-sm text-gray-500 dark:text-gray-400">Redirecting to downloads...</p>
          </div>
        </div>
      `;
      document.body.appendChild(successMessage);

      // Close modal and redirect after animation
      setTimeout(() => {
        show = false;
        document.body.removeChild(successMessage);
        window.location.href = '/downloads/';
      }, 3000);
    } catch (error) {
      console.error('Error processing successful payment:', error);
      // Show error message to user
    }
  }

  function generateSecureToken() {
    return crypto.randomUUID();
  }

  function handleClose() {
    show = false;
    dispatch('close');
  }

  function handlePaymentSelect(methodId: string) {
    selectedMethod = methodId;
    generateInvoice();
  }

  function copyAddress(address: string) {
    navigator.clipboard.writeText(address);
    // Add toast notification here
  }

  $: if (typeof window !== 'undefined') {
    toggleBodyScroll(show);
  }
</script>

{#if show}
  <div 
    use:portal={'body'} 
    class="fixed inset-0 flex items-center justify-center z-50 p-4"
    transition:fade={{ duration: 200 }}
  >
    <!-- Backdrop with blur effect - removed click handler -->
    <div 
      class="absolute inset-0 backdrop-blur-sm bg-black/50"
      transition:blur={{ duration: 200 }}
    ></div>

    <!-- Modal container with rounded corners -->
    <div 
      class="relative bg-white dark:bg-[var(--card-bg)] rounded-3xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
      transition:scale={{
        duration: 300,
        delay: 100,
        opacity: 0,
        start: 0.95,
        easing: quintOut
      }}
    >
      <!-- Header with matching rounded corners -->
      <div class="sticky top-0 z-10 bg-inherit p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center rounded-t-3xl">
        <h2 class="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Icon icon="material-symbols:payments-outline" class="w-6 h-6" />
          Select Payment Method
        </h2>
        <button 
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors duration-200"
          on:click={handleClose}
        >
          <Icon icon="material-symbols:close" class="w-6 h-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
        </button>
      </div>

      <!-- Content with custom scrollbar -->
      <div class="flex-1 overflow-y-auto custom-scrollbar">
        <div class="p-4 space-y-6"> <!-- Increased space-y for better spacing -->
          <div class="space-y-4"> <!-- Payment methods section -->
            {#each paymentMethods as method}
              <button 
                class="w-full flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                class:selected={selectedMethod === method.id}
                on:click={() => handlePaymentSelect(method.id)}
              >
                <div class="flex-shrink-0">
                  <Icon icon={method.icon} class="w-6 h-6 text-gray-900 dark:text-gray-100" />
                </div>
                <div class="flex-1"> 
                  <span class="font-medium block text-gray-900 dark:text-gray-100">{method.name}</span>
                  <span class="text-sm text-gray-600 dark:text-gray-400">{method.description}</span>
                </div>
                <Icon icon="material-symbols:chevron-right" class="w-5 h-5 text-gray-400" />
              </button>
            {/each}
          </div>

          {#if selectedMethod}
            <div 
              class="space-y-6 bg-gray-50 dark:bg-gray-700 rounded-xl p-6"
              transition:scale={{ duration: 200, opacity: 0.5 }}
            >
              <!-- Payment info with better spacing -->
              <div class="flex justify-between items-start gap-4">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                  <p class="text-lg font-bold text-gray-900 dark:text-gray-100">${total.toFixed(2)}</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Satoshis: {satoshis.toFixed(0)}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-600 dark:text-gray-400">Network</p>
                  <p class="font-medium text-gray-900 dark:text-gray-100">{paymentMethods.find(m => m.id === selectedMethod)?.network}</p>
                </div>
              </div>

              <!-- Invoice and QR section with better spacing -->
              {#if isGeneratingInvoice}
                <div class="flex flex-col items-center justify-center p-8 space-y-4" in:fade>
                  <div class="loader">
                    <div class="circle"></div>
                    <div class="circle"></div>
                    <div class="circle"></div>
                    <div class="circle"></div>
                  </div>
                  <p class="text-gray-700 dark:text-gray-300 font-medium animate-pulse">
                    Generating invoice...
                  </p>
                </div>
              {:else if invoice}
                <div class="space-y-6">
                  <!-- Invoice copy section with rounded corners -->
                  <div class="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-600 rounded-xl">
                    <code class="text-sm break-all text-gray-900 dark:text-gray-100">{invoice}</code>
                    <button 
                      class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                      on:click={() => copyAddress(invoice)}
                    >
                      <Icon icon="material-symbols:content-copy" class="w-5 h-5" />
                    </button>
                  </div>

                  <!-- QR code section with better centering and rounded corners -->
                  <div class="flex flex-col items-center justify-center p-6 bg-white dark:bg-[var(--card-bg)] rounded-xl">
                    <p class="text-gray-400 mb-4">Scan QR Code to Pay</p>
                    <!-- Added container with fixed dimensions for QR code -->
                    <div class="w-[200px] h-[200px] relative flex items-center justify-center">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${invoice}&size=200x200`} 
                        alt="QR Code"
                      />
                    </div>
                  </div>

                  <!-- Payment status section -->
                  <div class="flex flex-col items-center gap-4">
                    {#if paymentResult}
                      <p class="mt-2 text-sm font-medium" class:text-green-500={paymentResult.includes('✅')} 
                        class:text-red-500={paymentResult.includes('❌')}
                        class:text-yellow-500={paymentResult.includes('⚠️')}
                        class:text-blue-500={paymentResult.includes('⏳') || paymentResult.includes('🔄')}
                      >
                        {paymentResult}
                      </p>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Remove global body.modal-open style */

  /* Add scrollbar styling */
  :global(.dark) .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgb(75, 85, 99) rgb(31, 41, 55);
  }

  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgb(156, 163, 175) rgb(243, 244, 246);
  }

  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: rgb(243, 244, 246);
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgb(156, 163, 175);
    border-radius: 4px;
  }

  :global(.dark) .overflow-y-auto::-webkit-scrollbar-track {
    background: rgb(31, 41, 55);
  }

  :global(.dark) .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgb(75, 85, 99);
  }

  /* Selected Payment Method */
  .selected {
    @apply bg-[var(--primary)] text-white;
  }

  .selected .text-gray-600 {
    @apply text-white;
  }

  :global(.dark) .text-green-500 {
    color: rgb(34, 197, 94);
  }

  :global(.dark) .text-red-500 {
    color: rgb(239, 68, 68);
  }

  :global(.dark) .text-yellow-500 {
    color: rgb(234, 179, 8);
  }

  :global(.dark) .text-blue-500 {
    color: rgb(59, 130, 246);
  }

  /* Add smooth transitions */
  .flex-col {
    transition: height 0.3s ease-in-out;
  }

  /* Improved spacing utilities */
  .space-y-6 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 1.5rem;
  }

  .space-y-4 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 1rem;
  }

  .space-y-3 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 0.75rem;
  }

  .space-y-2 > :not([hidden]) ~ :not([hidden]) {
    margin-top: 0.5rem;
  }

  /* Add smooth transition for QR code */
  img {
    transition: transform 0.2s ease;
  }

  img:hover {
    transform: scale(1.02);
  }

  /* Custom loader animation */
  .loader {
    position: relative;
    width: 80px;
    height: 80px;
    animation: rotate 2s linear infinite;
  }

  .circle {
    position: absolute;
    width: 60%;
    height: 60%;
    border-radius: 50%;
    background: var(--primary, #3b82f6);
    animation: chase 2s ease-in-out infinite;
  }

  .circle:nth-child(1) {
    animation-delay: -0.3s;
  }
  .circle:nth-child(2) {
    animation-delay: -0.6s;
  }
  .circle:nth-child(3) {
    animation-delay: -0.9s;
  }
  .circle:nth-child(4) {
    animation-delay: -1.2s;
  }

  @keyframes rotate {
    100% { transform: rotate(360deg); }
  }

  @keyframes chase {
    0% {
      transform: scale(0.3) rotate(0deg);
      opacity: 0.8;
    }
    50% {
      transform: scale(1) rotate(180deg);
      opacity: 0.4;
    }
    100% {
      transform: scale(0.3) rotate(360deg);
      opacity: 0.8;
    }
  }

  /* Smooth transitions */
  :global(.scale-enter) {
    animation: scale-in 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  :global(.scale-leave) {
    animation: scale-out 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes scale-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes scale-out {
    from {
      transform: scale(1);
      opacity: 1;
    }
    to {
      transform: scale(0.95);
      opacity: 0;
    }
  }

  /* Content transitions */
  .space-y-6 {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Hover effects */
  button:not(:disabled):hover {
    transform: translateY(-2px);
    filter: brightness(1.1);
  }

  button:not(:disabled):active {
    transform: translateY(0);
  }

  .flex-col {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Always show scrollbar to prevent layout shift */
  .overflow-y-scroll {
    scrollbar-gutter: stable;
  }

  /* Improved close button hover effect */
  button:hover .w-6.h-6 {
    transform: scale(1.1);
    transition: transform 0.2s ease;
  }

  /* Custom scrollbar styling */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgb(156, 163, 175) transparent;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgb(156, 163, 175);
    border-radius: 20px;
  }

  :global(.dark) .custom-scrollbar {
    scrollbar-color: rgb(75, 85, 99) transparent;
  }

  :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgb(75, 85, 99);
  }

  /* Hover effect for scrollbar */
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgb(107, 114, 128);
  }

  :global(.dark) .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgb(107, 114, 128);
  }

  /* Make inner containers match the rounded corners */
  .rounded-xl {
    @apply rounded-2xl;
  }

  /* Add success checkmark animation styles */
  .success-checkmark {
    width: 80px;
    height: 80px;
    margin: 0 auto;
  }

  .check-icon {
    width: 80px;
    height: 80px;
    position: relative;
    border-radius: 50%;
    box-sizing: content-box;
    border: 4px solid #4CAF50;
  }

  .check-icon::before {
    top: 3px;
    left: -2px;
    width: 30px;
    transform-origin: 100% 50%;
    border-radius: 100px 0 0 100px;
  }

  .check-icon::after {
    top: 0;
    left: 30px;
    width: 60px;
    transform-origin: 0 50%;
    border-radius: 0 100px 100px 0;
    animation: rotate-circle 4.25s ease-in;
  }

  .check-icon::before, .check-icon::after {
    content: '';
    height: 100px;
    position: absolute;
    background: #FFFFFF;
    transform: rotate(-45deg);
  }

  .icon-line {
    height: 5px;
    background-color: #4CAF50;
    display: block;
    border-radius: 2px;
    position: absolute;
    z-index: 10;
  }

  .line-tip {
    top: 46px;
    left: 14px;
    width: 25px;
    transform: rotate(45deg);
    animation: icon-line-tip 0.75s;
  }

  .line-long {
    top: 38px;
    right: 8px;
    width: 47px;
    transform: rotate(-45deg);
    animation: icon-line-long 0.75s;
  }

  .icon-circle {
    top: -4px;
    left: -4px;
    z-index: 10;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    position: absolute;
    box-sizing: content-box;
    border: 4px solid rgba(76, 175, 80, .5);
  }

  .icon-fix {
    top: 8px;
    width: 5px;
    left: 26px;
    z-index: 1;
    height: 85px;
    position: absolute;
    transform: rotate(-45deg);
    background-color: #FFFFFF;
  }

  @keyframes rotate-circle {
    0% { transform: rotate(-45deg); }
    5% { transform: rotate(-45deg); }
    12% { transform: rotate(-405deg); }
    100% { transform: rotate(-405deg); }
  }

  @keyframes icon-line-tip {
    0% { width: 0; left: 1px; top: 19px; }
    54% { width: 0; left: 1px; top: 19px; }
    70% { width: 50px; left: -8px; top: 37px; }
    84% { width: 17px; left: 21px; top: 48px; }
    100% { width: 25px; left: 14px; top: 46px; }
  }

  @keyframes icon-line-long {
    0% { width: 0; right: 46px; top: 54px; }
    65% { width: 0; right: 46px; top: 54px; }
    84% { width: 55px; right: 0px; top: 35px; }
    100% { width: 47px; right: 8px; top: 38px; }
  }

  .scale-up {
    animation: scale-up 0.4s ease-out;
  }

  @keyframes scale-up {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
</style>

<script context="module"> 
  // Add/remove body class when modal opens/closes
  function toggleBodyScroll(show: boolean) {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('modal-open', show);
    }
  }
</script>

