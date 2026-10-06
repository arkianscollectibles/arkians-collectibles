// ======================================================
// PRODUCTS
// ======================================================

// Metadata and prices share the same catalogue used by checkout.
const coins = Object.entries(window.ARKIANS_PRICES.products).map(([id, product]) => ({
  ...product,
  id: Number(id),
  price: product.price_cents / 100,
}));



// ======================================================
// HEART SVG
// ======================================================

const HEART_SVG = `
  <svg viewBox="0 0 24 24">
    <path
      d="M20.8 4.6c-2-2-5.3-2-7.3 0L12 6.1l-1.5-1.5c-2-2-5.3-2-7.3 0s-2 5.3 0 7.3L12 20.7l8.8-8.8c2-2 2-5.3 0-7.3z"
    ></path>
  </svg>
`;



// ======================================================
// WISHLIST DATA
// ======================================================

let wishlistIds = new Set();


async function loadWishlistIds() {

  if (typeof supabaseClient === "undefined") {
    wishlistIds = new Set();
    return;
  }

  const {
    data: { user },
    error: userError
  } = await supabaseClient.auth.getUser();

  if (userError || !user) {
    wishlistIds = new Set();
    return;
  }

  const { data, error } = await supabaseClient
    .from("wishlist")
    .select("coin_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Wishlist load error:", error);
    return;
  }

  wishlistIds = new Set(
    (data || []).map((item) => Number(item.coin_id))
  );
}



async function toggleWishlist(coinId, button) {

  if (typeof supabaseClient === "undefined") {
    window.location.href = "account.html";
    return false;
  }

  const {
    data: { user }
  } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "account.html";
    return false;
  }


  if (wishlistIds.has(Number(coinId))) {

    const { error } = await supabaseClient
      .from("wishlist")
      .delete()
      .eq("user_id", user.id)
      .eq("coin_id", coinId);

    if (error) {
      console.error("Wishlist remove error:", error);
      return false;
    }

    wishlistIds.delete(Number(coinId));

    if (button) {
      button.classList.remove("active");
    }

  } else {

    const { error } = await supabaseClient
      .from("wishlist")
      .insert({
        user_id: user.id,
        coin_id: coinId
      });

    if (error) {
      console.error("Wishlist add error:", error);
      return false;
    }

    wishlistIds.add(Number(coinId));

    if (button) {
      button.classList.add("active");
    }
  }

  return true;
}



function activateWishlistButtons() {

  document
    .querySelectorAll(".wishlist-heart")
    .forEach((button) => {

      button.onclick = async (event) => {

        event.preventDefault();
        event.stopPropagation();

        const coinId =
          Number(button.dataset.coinId);

        const success =
          await toggleWishlist(
            coinId,
            button
          );

        if (
          success &&
          document.getElementById("wishlistItems")
        ) {
          await renderWishlistPage();
        }
      };
    });
}



// ======================================================
// HOME - NEW ARRIVALS
// ======================================================

function renderNewArrivals() {

  const container =
    document.getElementById("newArrivals");

  if (!container) return;

  container.innerHTML = "";

  coins.slice(0, 4).forEach((coin) => {

    const card =
      document.createElement("div");

    card.className = "coin-card";

    card.innerHTML = `

      <a
        href="product.html?id=${coin.id}"
        class="coin-product-link"
      >
        <img
          class="coin-card-image"
          src="${coin.image}"
          alt="${coin.name}"
        >
      </a>

      <a
        href="product.html?id=${coin.id}"
        class="coin-card-title coin-product-link"
      >
        ${coin.name}
      </a>

      <div class="coin-card-meta">
        ${coin.country} · ${coin.year}
      </div>

      <div class="coin-card-price">
        €${coin.price.toFixed(2)}
      </div>
    `;

    container.appendChild(card);
  });
}



// ======================================================
// FILTER ACCORDION
// ======================================================

function setupFilterAccordion() {
  document.querySelectorAll('.filter-title').forEach((button, index) => {
    const options = button.closest('.filter-group')?.querySelector('.filter-options');
    if (!options) return;
    options.id = `filter-options-${index}`;
    options.hidden = true;
    button.setAttribute('aria-controls', options.id);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      options.hidden = !options.hidden;
      button.setAttribute('aria-expanded', String(!options.hidden));
    });
  });
}

// ======================================================
// ALL COINS
// ======================================================

function renderAllCoins(list) {

  const container =
    document.getElementById("allCoins");

  if (!container) return;

  container.innerHTML = "";

  list.forEach((coin) => {

    const card =
      document.createElement("div");

    card.className = "coin-card";

    card.innerHTML = `

      <div class="coin-image-wrapper">

        <a
          href="product.html?id=${coin.id}"
          class="coin-product-link"
        >
          <img
            class="coin-card-image"
            src="${coin.image}"
            alt="${coin.name}"
          >
        </a>


        <button
          class="wishlist-heart ${
            wishlistIds.has(Number(coin.id))
              ? "active"
              : ""
          }"
          data-coin-id="${coin.id}"
          type="button"
          aria-label="Wishlist"
        >
          ${HEART_SVG}
        </button>

      </div>


      <a
        href="product.html?id=${coin.id}"
        class="coin-card-title coin-product-link"
      >
        ${coin.name}
      </a>


      <div class="coin-card-meta">
        ${coin.country} · ${coin.year}
      </div>


      <div class="coin-card-price">
        €${coin.price.toFixed(2)}
      </div>


      <button
        class="add-cart-button"
        data-coin-id="${coin.id}"
        type="button"
      >
        <span data-i18n="add_cart">Add to Cart</span>
      </button>
    `;

    container.appendChild(card);
  });

  activateWishlistButtons();
}



function applyFilters() {

  const container =
    document.getElementById("allCoins");

  if (!container) return;


  const selectedCountries = [
    ...document.querySelectorAll(
      ".country-filter:checked"
    )
  ].map((input) => input.value);


  const selectedYears = [
    ...document.querySelectorAll(
      ".year-filter:checked"
    )
  ].map((input) =>
    Number(input.value)
  );


  const selectedColored = [
    ...document.querySelectorAll(
      'input[name="colored"]:checked'
    )
  ].map((input) => input.value);


  const params =
    new URLSearchParams(
      window.location.search
    );

  const searchQuery =
    (params.get("search") || "")
      .trim()
      .toLowerCase();


  const filteredCoins =
    (window.ARKIANS_CATALOGS?.[document.querySelector("[data-catalog]")?.dataset.catalog] || coins).filter((coin) => {

      const countryMatch =
        selectedCountries.length === 0 ||
        selectedCountries.includes(
          coin.country
        );


      const yearMatch =
        selectedYears.length === 0 ||
        selectedYears.includes(
          Number(coin.year)
        );


      const coloredMatch =
        selectedColored.length === 0 ||

        (
          selectedColored.includes("yes") &&
          coin.colored === true
        ) ||

        (
          selectedColored.includes("no") &&
          coin.colored === false
        );


      const searchMatch =
        searchQuery === "" ||

        coin.name
          .toLowerCase()
          .includes(searchQuery) ||

        coin.country
          .toLowerCase()
          .includes(searchQuery) ||

        String(coin.year)
          .includes(searchQuery);


      return (
        countryMatch &&
        yearMatch &&
        coloredMatch &&
        searchMatch
      );

    });


  const catalog = document.querySelector('[data-catalog]')?.dataset.catalog;
  if (catalog === 'cards' || catalog === 'proof') {
    window.arkiansRenderTemplates(container, filteredCoins);
  } else {
    renderAllCoins(filteredCoins);
    if (!filteredCoins.length) {
      container.innerHTML = '<p data-i18n="no_products">No products match these filters.</p>';
    }
  }
}


function setupFilterCheckboxes() {

  document
    .querySelectorAll(
      ".country-filter, .year-filter, input[name='colored']"
    )
    .forEach((checkbox) => {

      checkbox.addEventListener(
        "change",
        applyFilters
      );

    });
}



async function initAllCoinsPage() {

  const container =
    document.getElementById("allCoins");

  if (!container) return;


  // Catalogue browsing must work even if the backend is unreachable.
  const params =
    new URLSearchParams(
      window.location.search
    );


  const countryFromURL =
    params.get("country");

  const yearFromURL =
    params.get("year");


  if (countryFromURL) {

    const checkbox =
      [...document.querySelectorAll(".country-filter")].find(input => input.value === countryFromURL);

    if (checkbox) {
      checkbox.checked = true;
    }
  }


  if (yearFromURL) {

    const checkbox =
      [...document.querySelectorAll(".year-filter")].find(input => input.value === yearFromURL);

    if (checkbox) {
      checkbox.checked = true;
    }
  }


  applyFilters();
  if (document.querySelector('[data-catalog]')?.dataset.catalog === 'coins') {
    loadWishlistIds().then(applyFilters).catch(error => {
      console.error('Wishlist unavailable:', error);
    });
  }
}



// ======================================================
// WISHLIST PAGE
// ======================================================

async function renderWishlistPage() {

  const container =
    document.getElementById(
      "wishlistItems"
    );

  const emptyMessage =
    document.getElementById(
      "wishlistEmpty"
    );


  if (!container) return;


  if (
    typeof supabaseClient ===
    "undefined"
  ) {
    return;
  }


  const {
    data: { user }
  } =
    await supabaseClient.auth.getUser();


  if (!user) {
    window.location.href =
      "account.html";
    return;
  }


  await loadWishlistIds();


  const savedCoins =
    coins.filter((coin) =>
      wishlistIds.has(
        Number(coin.id)
      )
    );


  container.innerHTML = "";


  if (savedCoins.length === 0) {

    if (emptyMessage) {
      emptyMessage.style.display =
        "block";
    }

    return;
  }


  if (emptyMessage) {
    emptyMessage.style.display =
      "none";
  }


  savedCoins.forEach((coin) => {

    const card =
      document.createElement("div");

    card.className =
      "wishlist-card";


    card.innerHTML = `

      <div class="coin-image-wrapper">

        <a
          href="product.html?id=${coin.id}"
          class="coin-product-link"
        >
          <img
            src="${coin.image}"
            alt="${coin.name}"
          >
        </a>


        <button
          class="wishlist-heart active"
          data-coin-id="${coin.id}"
          type="button"
          aria-label="Remove from wishlist"
        >
          ${HEART_SVG}
        </button>

      </div>


      <h3>
        <a
          href="product.html?id=${coin.id}"
          class="coin-product-link"
        >
          ${coin.name}
        </a>
      </h3>


      <div class="wishlist-card-meta">
        ${coin.country} · ${coin.year}
      </div>


      <div class="wishlist-card-price">
        €${coin.price.toFixed(2)}
      </div>


      <button
        class="add-cart-button"
        data-coin-id="${coin.id}"
        type="button"
      >
        <span data-i18n="add_cart">Add to Cart</span>
      </button>
    `;


    container.appendChild(card);
  });


  activateWishlistButtons();
}



// ======================================================
// CART - ADD PRODUCT
// ======================================================

async function addCoinToCart(
  coinId,
  button
) {

  if (
    typeof supabaseClient ===
    "undefined"
  ) {
    window.location.href =
      "account.html";
    return;
  }


  const {
    data: { user }
  } =
    await supabaseClient.auth.getUser();


  if (!user) {
    window.location.href =
      "account.html";
    return;
  }


  const {
    data: existingItem,
    error: loadError
  } =
    await supabaseClient
      .from("cart")
      .select("quantity")
      .eq("user_id", user.id)
      .eq("coin_id", coinId)
      .maybeSingle();


  if (loadError) {
    console.error(
      "Cart load error:",
      loadError
    );
    return;
  }


  if (existingItem) {

    if (
      Number(existingItem.quantity) >=
      100
    ) {

      if (button) {
        button.textContent =
          "Max 100";
      }

      return;
    }


    const { error } =
      await supabaseClient
        .from("cart")
        .update({
          quantity:
            Number(
              existingItem.quantity
            ) + 1
        })
        .eq("user_id", user.id)
        .eq("coin_id", coinId);


    if (error) {
      console.error(
        "Cart update error:",
        error
      );
      return;
    }

  } else {

    const { error } =
      await supabaseClient
        .from("cart")
        .insert({
          user_id: user.id,
          coin_id: coinId,
          quantity: 1
        });


    if (error) {
      console.error(
        "Cart add error:",
        error
      );
      return;
    }
  }


  if (button) {

    const originalText =
      button.textContent;

    button.textContent =
      "Added ✓";


    setTimeout(() => {

      button.textContent =
        originalText;

    }, 1200);
  }
}



// ======================================================
// CART - QUANTITY / REMOVE
// ======================================================

async function updateCartQuantity(
  coinId,
  newQuantity
) {

  if (
    newQuantity < 1 ||
    newQuantity > 100
  ) {
    return;
  }


  const {
    data: { user }
  } =
    await supabaseClient.auth.getUser();


  if (!user) return;


  const { error } =
    await supabaseClient
      .from("cart")
      .update({
        quantity: newQuantity
      })
      .eq("user_id", user.id)
      .eq("coin_id", coinId);


  if (error) {
    console.error(
      "Cart quantity error:",
      error
    );
    return;
  }


  await renderCartPage();
}



async function removeCartItem(
  coinId
) {

  const {
    data: { user }
  } =
    await supabaseClient.auth.getUser();


  if (!user) return;


  const { error } =
    await supabaseClient
      .from("cart")
      .delete()
      .eq("user_id", user.id)
      .eq("coin_id", coinId);


  if (error) {
    console.error(
      "Cart remove error:",
      error
    );
    return;
  }


  await renderCartPage();
}



// ======================================================
// CART PAGE
// ======================================================

async function renderCartPage() {

  const container =
    document.getElementById(
      "cartItems"
    );

  const emptyMessage =
    document.getElementById(
      "cartEmpty"
    );

  const summary =
    document.getElementById(
      "cartSummary"
    );

  const subtotalElement =
    document.getElementById(
      "cartSubtotal"
    );

  const totalElement =
    document.getElementById(
      "cartTotal"
    );


  if (!container) return;


  if (
    typeof supabaseClient ===
    "undefined"
  ) {
    return;
  }


  const {
    data: { user }
  } =
    await supabaseClient.auth.getUser();


  if (!user) {
    window.location.href =
      "account.html";
    return;
  }


  const { data, error } =
    await supabaseClient
      .from("cart")
      .select(
        "coin_id, quantity"
      )
      .eq("user_id", user.id);


  if (error) {
    console.error(
      "Cart load error:",
      error
    );
    return;
  }


  container.innerHTML = "";


  if (
    !data ||
    data.length === 0
  ) {

    if (emptyMessage) {
      emptyMessage.style.display =
        "block";
    }

    if (summary) {
      summary.style.display =
        "none";
    }

    return;
  }


  if (emptyMessage) {
    emptyMessage.style.display =
      "none";
  }


  if (summary) {
    summary.style.display =
      "block";
  }


  let subtotal = 0;


  data.forEach((item) => {

    const coin =
      coins.find(
        (coin) =>
          Number(coin.id) ===
          Number(item.coin_id)
      );


    if (!coin) return;


    subtotal +=
      coin.price *
      Number(item.quantity);


    const card =
      document.createElement("div");

    card.className =
      "cart-card";


    card.innerHTML = `

      <a
        href="product.html?id=${coin.id}"
        class="coin-product-link"
      >
        <img
          class="cart-card-image"
          src="${coin.image}"
          alt="${coin.name}"
        >
      </a>


      <div class="cart-card-info">

        <h3>
          <a
            href="product.html?id=${coin.id}"
            class="coin-product-link"
          >
            ${coin.name}
          </a>
        </h3>


        <div class="cart-card-meta">
          ${coin.country} · ${coin.year}
        </div>


        <div class="cart-card-price">
          €${coin.price.toFixed(2)}
        </div>


        <div
          class="cart-quantity-controls"
        >

          <button
            class="cart-minus"
            type="button"
            ${
              Number(item.quantity) <= 1
                ? "disabled"
                : ""
            }
          >
            −
          </button>


          <span
            class="cart-quantity"
          >
            ${item.quantity}
          </span>


          <button
            class="cart-plus"
            type="button"
            ${
              Number(item.quantity) >= 100
                ? "disabled"
                : ""
            }
          >
            +
          </button>

        </div>


        <button
          class="cart-remove"
          type="button"
        >
          Remove
        </button>

      </div>
    `;


    const minusButton =
      card.querySelector(
        ".cart-minus"
      );

    const plusButton =
      card.querySelector(
        ".cart-plus"
      );

    const removeButton =
      card.querySelector(
        ".cart-remove"
      );


    minusButton.addEventListener(
  "click",
  async () => {

    await updateCartQuantity(
      coin.id,
      Number(item.quantity) - 1
    );

  }
);
plusButton.addEventListener(
  "click",
  async () => {

    await updateCartQuantity(
      coin.id,
      Number(item.quantity) + 1
    );

  }
);


removeButton.addEventListener(
  "click",
  async () => {

    await removeCartItem(
      coin.id
    );

  }
);


container.appendChild(card);

});


if (subtotalElement) {
  subtotalElement.textContent =
    `€${subtotal.toFixed(2)}`;
}


const shippingElement = document.getElementById('cartShipping');
if (shippingElement) shippingElement.textContent = `€${(window.ARKIANS_PRICES.shipping_cents / 100).toFixed(2)}`;
if (totalElement) {
  totalElement.textContent =
    `€${(subtotal + window.ARKIANS_PRICES.shipping_cents / 100).toFixed(2)}`;
}

}



// ======================================================
// PRODUCT PAGE - WISHLIST BUTTON
// ======================================================

function updateProductWishlistButton(
  button,
  active
) {

  if (!button) return;

  button.classList.toggle(
    "active",
    active
  );

  button.innerHTML = `
    ${HEART_SVG}
    <span>
      ${
        active
          ? "In Wishlist"
          : "Add to Wishlist"
      }
    </span>
  `;
}



// ======================================================
// PRODUCT PAGE - RELATED PRODUCTS
// ======================================================

function renderRelatedProducts(currentCoin) {

  const container =
    document.getElementById(
      "relatedProducts"
    );

  if (!container) return;


  const sameCountry =
    coins.filter(
      (coin) =>
        Number(coin.id) !==
          Number(currentCoin.id) &&
        coin.country ===
          currentCoin.country
    );


  const otherCoins =
    coins.filter((coin) => {

      if (
        Number(coin.id) ===
        Number(currentCoin.id)
      ) {
        return false;
      }


      const alreadyIncluded =
        sameCountry.some(
          (item) =>
            Number(item.id) ===
            Number(coin.id)
        );


      return !alreadyIncluded;
    });


  const relatedCoins = [
    ...sameCountry,
    ...otherCoins
  ].slice(0, 3);


  container.innerHTML = "";


  relatedCoins.forEach((coin) => {

    const card =
      document.createElement("div");

    card.className = "coin-card";


    card.innerHTML = `

      <a
        href="product.html?id=${coin.id}"
        class="coin-product-link"
      >
        <img
          class="coin-card-image"
          src="${coin.image}"
          alt="${coin.name}"
        >
      </a>


      <a
        href="product.html?id=${coin.id}"
        class="coin-card-title coin-product-link"
      >
        ${coin.name}
      </a>


      <div class="coin-card-meta">
        ${coin.country} · ${coin.year}
      </div>


      <div class="coin-card-price">
        €${coin.price.toFixed(2)}
      </div>


      <button
        class="add-cart-button"
        data-coin-id="${coin.id}"
        type="button"
      >
        <span data-i18n="add_cart">Add to Cart</span>
      </button>
    `;


    container.appendChild(card);
  });
}



// ======================================================
// PRODUCT DETAIL PAGE
// ======================================================

async function renderProductPage() {

  const productName =
    document.getElementById(
      "productName"
    );

  if (!productName) return;


  const params =
    new URLSearchParams(
      window.location.search
    );


  const coinId =
    Number(params.get("id"));


  const coin =
    coins.find(
      (coin) =>
        Number(coin.id) === coinId
    );


  if (!coin) {
    productName.textContent =
      "Product not found";
    return;
  }


  const productImage =
    document.getElementById(
      "productImage"
    );

  const productMeta =
    document.getElementById(
      "productMeta"
    );

  const productPrice =
    document.getElementById(
      "productPrice"
    );

  const productDescription =
    document.getElementById(
      "productDescription"
    );

  const addToCartButton =
    document.getElementById(
      "productAddToCart"
    );

  const wishlistButton =
    document.getElementById(
      "productWishlistButton"
    );


  if (productImage) {
    productImage.src = coin.image;
    productImage.alt = coin.name;
  }


  productName.textContent =
    coin.name;


  if (productMeta) {
    productMeta.textContent =
      `${coin.country} · ${coin.year}`;
  }


  if (productPrice) {
    productPrice.textContent =
      `€${coin.price.toFixed(2)}`;
  }


  if (productDescription) {
    productDescription.textContent =
      coin.description ||
      `A collectible €2 coin from ${coin.country}, issued in ${coin.year}.`;
  }


  if (addToCartButton) {
    addToCartButton.dataset.coinId =
      coin.id;
  }


  await loadWishlistIds();


  if (wishlistButton) {

    updateProductWishlistButton(
      wishlistButton,
      wishlistIds.has(
        Number(coin.id)
      )
    );


    wishlistButton.onclick =
      async () => {

        const success =
          await toggleWishlist(
            coin.id,
            wishlistButton
          );

        if (!success) return;


        updateProductWishlistButton(
          wishlistButton,
          wishlistIds.has(
            Number(coin.id)
          )
        );

      };
  }


  renderRelatedProducts(coin);
}



// ======================================================
// GLOBAL ADD TO CART
// ======================================================

function setupAddToCartButtons() {

  document.addEventListener(
    "click",
    async (event) => {

      const button =
        event.target.closest(
          ".add-cart-button"
        );

      if (!button) return;


      event.preventDefault();


      const coinId =
        Number(
          button.dataset.coinId
        );


      if (!Number.isFinite(coinId)) {
        return;
      }


      await addCoinToCart(
        coinId,
        button
      );

    }
  );
}


// ======================================================
// STRIPE CHECKOUT
// ======================================================

function setupCheckoutButton() {

  const button =
    document.getElementById("checkoutButton");

  if (!button) return;


  button.addEventListener("click", async () => {

    const originalText =
      button.textContent;

    button.disabled = true;
    button.textContent = "Loading checkout...";


    try {

      const {
        data: { session }
      } = await supabaseClient.auth.getSession();


      if (!session) {
        window.location.href = "account.html";
        return;
      }


      const { data, error } =
        await supabaseClient.functions.invoke(
          "create-checkout-function",
          {
            body: {}
          }
        );


      if (error) {
        console.error(
          "Checkout function error:",
          error
        );

        alert(
          "Checkout could not start. Check the console."
        );

        return;
      }


      if (!data?.url) {
        console.error(
          "No Stripe URL returned:",
          data
        );

        alert(
          "Stripe checkout URL was not returned."
        );

        return;
      }


      window.location.href = data.url;

    } catch (error) {

      console.error(
        "Checkout error:",
        error
      );

      alert(
        "Something went wrong with checkout."
      );

    } finally {

      button.disabled = false;
      button.textContent = originalText;

    }

  });
}

// ======================================================
// VERIFY STRIPE PAYMENT
// ======================================================

async function verifyCheckoutSuccess() {

  const checking =
    document.getElementById("paymentChecking");

  const success =
    document.getElementById("paymentSuccess");

  const failed =
    document.getElementById("paymentFailed");

  const orderNumber =
    document.getElementById("orderNumber");


  if (!checking) return;


  const params =
    new URLSearchParams(window.location.search);

  const sessionId =
    params.get("session_id");


  // Someone opened success.html manually
  if (!sessionId) {

    checking.style.display = "none";
    failed.style.display = "block";

    return;
  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient.functions.invoke(
        "verify-checkout-session",
        {
          body: {
            session_id: sessionId
          }
        }
      );


    if (error) {

      console.error(
        "Payment verification error:",
        error
      );

      checking.style.display = "none";
      failed.style.display = "block";

      return;
    }


    if (data?.paid === true) {

      checking.style.display = "none";
      success.style.display = "block";

      if (orderNumber) {

        orderNumber.textContent =
          data.order_number || "—";
      }

      return;
    }


    checking.style.display = "none";
    failed.style.display = "block";


  } catch (error) {

    console.error(
      "Verification failed:",
      error
    );

    checking.style.display = "none";
    failed.style.display = "block";
  }
}

// ======================================================
// ORDER HISTORY
// ======================================================

async function renderOrderHistory() {

  const list =
    document.getElementById("ordersList");

  const loading =
    document.getElementById("ordersLoading");

  const empty =
    document.getElementById("ordersEmpty");


  if (!list) return;


  if (typeof supabaseClient === "undefined") {
    return;
  }


  const {
    data: { user }
  } = await supabaseClient.auth.getUser();


  if (!user) {
    window.location.href = "account.html";
    return;
  }


  const {
    data: orders,
    error: ordersError
  } = await supabaseClient
    .from("orders")
    .select(`
      id,
      order_number,
      amount_total,
      currency,
      status,
      created_at
    `)
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false
    });


  if (ordersError) {

    console.error(
      "Order history error:",
      ordersError
    );

    if (loading) {
      loading.textContent =
        "Could not load your orders.";
    }

    return;
  }


  if (loading) {
    loading.style.display = "none";
  }


  if (
    !orders ||
    orders.length === 0
  ) {

    if (empty) {
      empty.style.display = "block";
    }

    return;
  }


  if (empty) {
    empty.style.display = "none";
  }


  list.innerHTML = "";


  for (const order of orders) {

    const {
      data: items,
      error: itemsError
    } = await supabaseClient
      .from("order_items")
      .select(`
        coin_id,
        product_name,
        unit_amount,
        quantity
      `)
      .eq("order_id", order.id);


    if (itemsError) {

      console.error(
        "Order items error:",
        itemsError
      );

      continue;
    }


    const card =
      document.createElement("div");

    card.className = "order-card";


    const date =
      new Date(
        order.created_at
      ).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );


    const itemsHTML =
      (items || []).map((item) => {

        const coin =
          coins.find(
            (coin) =>
              Number(coin.id) ===
              Number(item.coin_id)
          );


        const image =
          coin?.image || "";


        const price =
          Number(item.unit_amount || 0) / 100;


        return `

          <div class="order-item">

            <img
              class="order-item-image"
              src="${image}"
              alt="${item.product_name}"
            >

            <div>

              <div class="order-item-name">
                ${item.product_name}
              </div>

              <div class="order-item-meta">
                Quantity: ${item.quantity}
              </div>

            </div>

            <div class="order-item-price">
              €${(
                price *
                Number(item.quantity)
              ).toFixed(2)}
            </div>

          </div>

        `;

      }).join("");


    card.innerHTML = `

      <div class="order-card-header">

        <div>

          <div class="order-card-number">
            ${order.order_number || "Order"}
          </div>

          <div class="order-card-date">
            ${date}
          </div>

        </div>


        <div class="order-status">
          ${
            order.status === "paid"
              ? "Paid"
              : order.status
          }
        </div>

      </div>


      <div class="order-items">
        ${itemsHTML}
      </div>


      <div class="order-card-footer">

        <span>Total</span>

        <strong>
          €${(
            Number(order.amount_total) /
            100
          ).toFixed(2)}
        </strong>

      </div>

    `;


    list.appendChild(card);
  }
}

// ======================================================
// SEARCH COINS
// ======================================================

function setupCoinSearch() {

  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");

  if (!form || !input) return;


  // If we are already on coins.html,
  // show the current search inside the input

  const params =
    new URLSearchParams(window.location.search);

  const currentSearch =
    params.get("search");

  if (currentSearch) {
    input.value = currentSearch;
  }


  form.addEventListener("submit", (event) => {

    event.preventDefault();

    const search =
      input.value.trim();

    if (!search) {
      window.location.href = "search.html";
      return;
    }

    window.location.href =
      `search.html?search=${encodeURIComponent(search)}`;


  });
}

// ======================================================
// INITIALIZE WEBSITE
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    renderNewArrivals();
    
    setupCheckoutButton();

    setupFilterAccordion();

    setupFilterCheckboxes();

    setupAddToCartButtons();
    
    setupCoinSearch();


    if (
      document.getElementById(
        "allCoins"
      )
    ) {
      await initAllCoinsPage();
    }


    if (
      document.getElementById(
        "wishlistItems"
      )
    ) {
      await renderWishlistPage();
    }


    if (
      document.getElementById(
        "cartItems"
      )
    ) {
      await renderCartPage();
    }


    if (
      document.getElementById(
        "productName"
      )
    ) {
      await renderProductPage();
    }

    if (
  document.getElementById("paymentChecking")
) {
  await verifyCheckoutSuccess();
}
if (
  document.getElementById("ordersList")
) {
  await renderOrderHistory();
}

  }
);
/* =========================
   WITHDRAWAL FORM
========================= */

const withdrawalForm = document.getElementById("withdrawalForm");

if (withdrawalForm) {

  const withdrawalMessage =
    document.getElementById("withdrawalMessage");

  withdrawalForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const fullName =
      document.getElementById("withdrawalName").value.trim();

    const email =
      document.getElementById("withdrawalEmail").value.trim();

    const orderNumber =
      document.getElementById("withdrawalOrder").value.trim();

    const items =
      document.getElementById("withdrawalItems").value.trim();

    const confirmationEmail =
      document
        .getElementById("withdrawalConfirmationEmail")
        .value
        .trim();


    withdrawalMessage.textContent =
      "Submitting your withdrawal request...";


    try {

      const withdrawalId = crypto.randomUUID();

const { error } = await supabaseClient
  .from("withdrawal_requests")
  .insert([
    {
      id: withdrawalId,
      full_name: fullName,
      email: email,
      order_number: orderNumber,
      items: items,
      confirmation_email: confirmationEmail
    }
  ]);


      if (error) {
        throw error;
      }
     
      withdrawalMessage.textContent =
  `Your withdrawal request has been submitted successfully.
   Reference: ${withdrawalId}`;

      withdrawalForm.reset();


      console.log(
  "Withdrawal request submitted:",
  withdrawalId
);

    } catch (error) {

      console.error(
        "Withdrawal submission error:",
        error
      );

      withdrawalMessage.textContent =
        "Something went wrong. Please try again or contact us directly.";

    }

  });

}
/* MOBILE HEADER MENU */

document.addEventListener("DOMContentLoaded", function () {

  const menuButton = document.querySelector(".mobile-menu-toggle");
  const mainNav = document.getElementById("mainNav");
  const closeButton = document.querySelector(".mobile-menu-close");

  if (!menuButton || !mainNav) return;


  function openMenu() {
    mainNav.classList.add("mobile-open");
    menuButton.classList.add("active");
    menuButton.setAttribute("aria-expanded", "true");
  }


  function closeMenu() {
    mainNav.classList.remove("mobile-open");
    menuButton.classList.remove("active");
    menuButton.setAttribute("aria-expanded", "false");
  }


  menuButton.addEventListener("click", function () {

    if (mainNav.classList.contains("mobile-open")) {
      closeMenu();
    } else {
      openMenu();
    }

  });


  if (closeButton) {
    closeButton.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    });
  }


  mainNav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

});
