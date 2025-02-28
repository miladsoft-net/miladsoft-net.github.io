<script lang="ts">
  import { cart } from "../store/cartStore";
  import type { CartItem } from "../store/cartStore";
  import { toast } from "../lib/toast";

  export let item: CartItem;

  $: isInCart = $cart.some((i) => i.slug === item.slug);

  function handleClick() {
    try {
      if (isInCart) {
        window.location.href = "/cart/";
      } else {
        const cartItem: CartItem = {
          slug: item.slug,
          title: item.title,
          price: item.price,
          salePrice: item.salePrice,
          fileName: item.fileName,
          addedAt: new Date().toISOString(),
          productUrl: item.productUrl,
        };
        cart.addItem(cartItem);
        toast.success(`${item.title} added to cart`);
      }
    } catch (error) {
      console.error("Failed to add item to cart:", error);
      toast.error("Failed to add item to cart");
    }
  }
</script>

<button
  class="w-full py-4 px-8 rounded-lg font-semibold transition-all bg-[var(--primary)] text-white text-center
         hover:opacity-90 hover:-translate-y-1 hover:shadow-lg
         active:translate-y-0 active:shadow-sm"
  class:in-cart={isInCart}
  on:click={handleClick}
>
  <span class="text-black/70 dark:text-white/70 font-medium">
    {isInCart ? "Go to Cart" : "Add to Cart"}
  </span>
</button>

<style>
  .in-cart {
    @apply bg-[#22c55e]/90 hover:bg-[#22c55e];
    @apply shadow-md shadow-[#22c55e]/20;
  }
</style>
