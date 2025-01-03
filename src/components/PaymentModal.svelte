<script lang="ts">
  import Icon from '@iconify/svelte';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { portal } from '../utils/portal'; // Updated import

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
      console.log('Starting workflow trigger for:', githubId, repositories);

      const workflowResponse = await fetch(
        'https://api.github.com/repos/miladsoft-net/miladsoft-net.github.io/actions/workflows/add-collaborator.yml/dispatches',
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`
          },
          body: JSON.stringify({
            ref: 'main',
            inputs: {
              username: githubId,
              repositories: repositories
                .map(repo => repo.split('/').pop())
                .filter(Boolean)
                .join(',')
            }
          })
        }
      );

      if (!workflowResponse.ok) {
        const errorDetails = await workflowResponse.json();
        throw new Error(`Workflow trigger failed: ${workflowResponse.status}, ${errorDetails.message}`);
      }

      console.log('Workflow triggered successfully.');

      // Poll the status of the workflow
      const workflowRunsUrl = `https://api.github.com/repos/miladsoft-net/miladsoft-net.github.io/actions/runs`;
      for (let i = 0; i < 10; i++) { // Maximum 10 attempts
        const statusResponse = await fetch(workflowRunsUrl, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });

        const statusData = await statusResponse.json();
        const latestRun = statusData.workflow_runs?.[0];
        
        if (latestRun && latestRun.status === 'completed') {
          console.log('Workflow completed:', latestRun.conclusion);
          return latestRun.conclusion === 'success';
        }

        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }

      throw new Error('Workflow did not complete within the expected time.');

    } catch (error) {
      console.error('Error in addGitHubCollaborator:', error);
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
  <div use:portal={'body'} class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
    <div class="bg-white dark:bg-[var(--card-bg)] rounded-lg shadow-lg w-full max-w-lg max-h-full overflow-auto">
      <div class="sticky top-0 bg-white dark:bg-[var(--card-bg)] p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 class="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Icon icon="material-symbols:payments-outline" class="w-6 h-6" />
          Select Payment Method
        </h2>
        <button class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" on:click={handleClose}>
          <Icon icon="material-symbols:close" class="w-6 h-6" />
        </button>
      </div>

      <div class="p-4 space-y-4">
        <div class="grid gap-4">
          {#each paymentMethods as method}
            <button 
              class="flex items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
            <!-- Add repository list display -->
            <div class="mb-4">
              <p class="text-sm text-gray-600 dark:text-gray-400">Repositories</p>
              <ul class="list-disc pl-5 mt-2">
                {#each repositories as repo}
                  <li class="text-gray-900 dark:text-gray-100">{repo}</li>
                {/each}
              </ul>
            </div>
            <div class="flex justify-between items-center">
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

            {#if isGeneratingInvoice}
              <div class="flex flex-col items-center justify-center p-8 space-y-4">
                <div class="w-12 h-12 border-4 border-blue-500 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-gray-700 dark:text-gray-300 font-medium">Generating invoice...</p>
              </div>
            {:else if invoice}
              <div class="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-600 rounded-lg animate-fade-in">
                <code class="text-sm break-all text-gray-900 dark:text-gray-100">{invoice}</code>
                <button 
                  class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" 
                  on:click={() => copyAddress(invoice)}
                >
                  <Icon icon="material-symbols:content-copy" class="w-5 h-5" />
                </button>
              </div>

              <div class="bg-white dark:bg-[var(--card-bg)] p-4 rounded-lg flex items-center justify-center animate-fade-in">
                <div class="text-gray-400 text-center">
                  <Icon icon="material-symbols:qr-code-2" class="w-12 h-12 mx-auto mb-2" />
                  <p>Scan QR Code to Pay</p>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?data=${invoice}&size=150x150`} alt="QR Code" />
                </div>
              </div>

              <div class="text-center mt-4 animate-fade-in">
                <button 
                  class="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50" 
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
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Prevent body scroll when modal is open */
  :global(body.modal-open) {
    overflow: hidden;
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
</style>

<script context="module">
  // Add/remove body class when modal opens/closes
  function toggleBodyScroll(show: boolean) {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('modal-open', show);
    }
  }
</script>

