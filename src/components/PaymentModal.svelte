<script lang="ts">
  import Icon from '@iconify/svelte';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { portal } from '../utils/portal'; // Updated import
  import { fade, scale, blur } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  const dispatch = createEventDispatcher();
  
  export let show = false;
  export let total: number;
  export let githubId: string;
  export let repositories: string[]; 

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
            paymentResult = '✅ Payment successful!';
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

  async function addGitHubCollaborator() {
    try {
      // از env متغیر را دریافت می‌کنیم
      const token = import.meta.env.VITE_GITHUB_TOKEN;
      if (!token) {
        console.error('GitHub token not found in environment variables');
        throw new Error('GitHub token is not configured');
      }

      console.log('Starting workflow trigger...');
      const workflowResponse = await fetch(
        'https://api.github.com/repos/miladsoft-net/miladsoft-net.github.io/actions/workflows/add-collaborator.yml/dispatches',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              username: githubId,
              repositories: repositories
                .map(repo => repo.replace('https://github.com/miladsoft-net/', ''))
                .join(',')
            }
          })
        }
      );

      // Poll workflow status
      let attempts = 0;
      const maxAttempts = 10;
      const pollInterval = 2000; // 2 seconds

      while (attempts < maxAttempts) {
        const statusResponse = await fetch(
          `https://api.github.com/repos/miladsoft-net/miladsoft-net.github.io/actions/runs?event=workflow_dispatch&status=completed`,
          {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );

        if (statusResponse.ok) {
          const data = await statusResponse.json();
          const latestRun = data.workflow_runs?.[0];
          
          if (latestRun?.conclusion === 'success') {
            console.log('Workflow completed successfully');
            return true;
          } else if (latestRun?.conclusion === 'failure') {
            console.error('Workflow failed:', latestRun);
            return false;
          }
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
      }

      throw new Error('Workflow check timed out');
    } catch (error) {
      console.error('GitHub Action Error:', error);
      return false;
    }
  }

  async function checkPaymentStatus() {
    if (!verifyUrl) {
      paymentResult = '⚠️ No active invoice to check';
      return;
    }

    isChecking = true;
    paymentResult = '🔄 Checking payment status...';

    try {
      const response = await fetch(verifyUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.settled) {
        paymentResult = '✅ Payment successful! Adding repository access...';
        const collaboratorAdded = await addGitHubCollaborator();
        if (collaboratorAdded) {
          paymentResult = '✅ Success! Repository access has been granted. Please check your email for invitations.';
        } else {
          paymentResult = '⚠️ Payment successful but there was an issue with repository access. Our team will review and process manually.';
        }
      } else if (data.status === 'OK') {
        paymentResult = '⏳ Payment pending. Please complete the payment.';
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      paymentResult = '❌ Could not verify payment status. Please try again.';
    } finally {
      isChecking = false;
    }
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
              <!-- Repository list with better spacing -->
              <div class="space-y-3">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Repositories</p>
                <ul class="list-disc pl-5 space-y-2">
                  {#each repositories as repo}
                    <li class="text-gray-900 dark:text-gray-100">{repo}</li>
                  {/each}
                </ul>
              </div>

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
                    <Icon icon="material-symbols:qr-code-2" class="w-12 h-12 mb-4 text-gray-400" />
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
                    <button 
                      class="bg-blue-500 text-white px-6 py-2.5 rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-colors" 
                      on:click={checkPaymentStatus}
                      disabled={isChecking || !invoice}
                    >
                      {#if isChecking}
                        <Icon icon="material-symbols:sync" class="animate-spin" />
                        Checking...
                      {:else}
                        Check Payment Status
                      {/if}
                    </button>
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
</style>

<script context="module">
  // Add/remove body class when modal opens/closes
  function toggleBodyScroll(show: boolean) {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('modal-open', show);
    }
  }
</script>

