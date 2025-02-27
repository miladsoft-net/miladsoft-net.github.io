<script lang="ts">
  import { cart, type CartItem } from "../store/cartStore";
  import { downloadStore } from "../store/downloadsStore";
  import type { Download } from "../store/downloadsStore";
  import { toast } from "../lib/toast";
  import Icon from "@iconify/svelte";
  import PaymentModal from "./PaymentModal.svelte";
  import { fade, fly } from "svelte/transition";
  import { onMount } from "svelte";
  import { v4 as uuidv4 } from "uuid";

  let isClient = false;
  let showPaymentModal = false;
  let crypto: Crypto;
  let userId = uuidv4();

  onMount(() => {
    isClient = true;
    if (typeof window !== "undefined") {
      crypto = window.crypto;
    }
  });

  // Use the cart store directly
  $: total = $cart.reduce(
    (sum, item) => sum + (item.salePrice || item.price),
    0
  );

  function handleCheckout() {
    showPaymentModal = true;
  }

  // Generate UUID safely
  function generateToken() {
    if (!isClient || !crypto) return "";

    try {
      // Bind the method to window.crypto to avoid "Illegal invocation"
      const randomUUID = crypto.randomUUID.bind(crypto);
      return randomUUID();
    } catch (e) {
      // Fallback for browsers that don't support crypto.randomUUID
      return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
  }

  async function handlePaymentSuccess() {
    if (!isClient) return;

    try {
      const timestamp = new Date().toISOString();
      let processedItems = 0;

      // Process each cart item
      for (const item of $cart) {
        if (!item.fileName) {
          console.warn(`Missing fileName for item: ${item.slug}`);
          continue;
        }

        const token = generateToken();
        if (!token) {
          throw new Error("Failed to generate token");
        }

        try {
          if (!downloadStore.checkExistingDownload(item.slug)) {
            const downloadItem: Download = {
              slug: item.slug,
              title: item.title,
              fileName: item.fileName,
              purchaseDate: timestamp,
              price: item.salePrice || item.price,
              userId: userId,
              quantity: 1,
            };

            downloadStore.addDownload(downloadItem);
          }
          processedItems++;
        } catch (error) {
          console.error(`Failed to process item ${item.slug}:`, error);
        }
      }

      // Only clear cart and redirect if all items were processed successfully
      if (processedItems === $cart.length) {
        // Clear the cart immediately
        cart.clear();

        toast.success("Purchase successful! Redirecting to downloads...");

        // Small delay before redirect to ensure cart is cleared and toasts are visible
        setTimeout(() => {
          window.location.href = "/downloads/";
        }, 1500);
      } else {
        throw new Error("Some items failed to process");
      }
    } catch (error) {
      console.error("Failed to process purchase:", error);
      toast.error("Failed to process purchase. Please try again.");
    }
  }

  // Prepare products info for PaymentModal with fileName
  $: products = $cart.map((item) => ({
    title: item.title,
    price: item.salePrice || item.price,
    slug: item.slug,
    fileName: item.fileName, // Ensure fileName is included
  }));
</script>

{#if isClient}
  <div class="min-h-[200px]">
    {#if $cart.length === 0}
      <div class="flex flex-col items-center justify-center h-[300px]" in:fade>
        <Icon
          icon="material-symbols:shopping-cart-outline"
          class="text-[var(--primary)] dark:text-[var(--primary)] w-20 h-20 animate-bounce"
        />
        <p class="mt-6 text-gray-500 dark:text-gray-400 text-lg font-medium">
          Your cart is empty
        </p>
      </div>
    {:else}
      <div class="flex flex-col gap-4" in:fade>
        {#each $cart as item}
          <div
            class="flex justify-between items-center p-4 bg-[var(--page-bg)] dark:bg-white/10 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
            in:fly={{ y: 20, duration: 300 }}
          >
            <div>
              <a
                href={`/posts/${item.slug}/`}
                class="text-gray-800 dark:text-white font-medium hover:text-[var(--primary)] transition-colors"
              >
                {item.title}
              </a>
              <div class="flex gap-2 items-center mt-1">
                {#if item.salePrice}
                  <span class="text-gray-700 dark:text-gray-300 line-through"
                    >${item.price}</span
                  >
                  <span class="text-[var(--primary)] font-semibold"
                    >${item.salePrice}</span
                  >
                {:else}
                  <span class="text-gray-600 dark:text-gray-300"
                    >${item.price}</span
                  >
                {/if}
              </div>
            </div>
            <button
              class="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all"
              on:click={() => cart.removeItem(item.slug)}
            >
              <Icon
                icon="material-symbols:delete-outline"
                class="w-6 h-6 sm:w-6 sm:h-6"
              />
            </button>
          </div>
        {/each}

        <div class="flex justify-between items-center p-4 mt-4">
          <span class="text-gray-800 dark:text-gray-200 font-semibold text-lg"
            >Total:</span
          >
          <span class="text-[var(--primary)] font-bold text-xl"
            >${total.toFixed(2)}</span
          >
        </div>

        <button
          class="w-full py-4 mt-4 bg-[var(--primary)] text-white rounded-xl font-semibold
               transition-all duration-300 ease-in-out hover:opacity-90 hover:-translate-y-1 hover:shadow-lg
               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
               disabled:bg-gray-400 dark:disabled:bg-gray-700 flex items-center justify-center gap-2"
          disabled={$cart.length === 0}
          on:click={handleCheckout}
        >
          <Icon
            icon="material-symbols:shopping-cart-checkout"
            class="w-6 h-6 sm:w-6 sm:h-6"
          />
          <span>Proceed to Checkout</span>
        </button>
      </div>
    {/if}
  </div>

  <PaymentModal
    bind:show={showPaymentModal}
    {total}
    {products}
    on:close={() => (showPaymentModal = false)}
    on:success={handlePaymentSuccess}
  />
{/if}
