/* Shared by generated product pages and their browser metadata.
 * Shipping matches checkout.ts; returns match returns.html. Catalogue products
 * are currently offered for purchase. Set product.availability explicitly when
 * an offer changes; never infer stock from whether its photograph loads.
 */
(() => {
  const domain = 'https://arkianscollectibles.com/';
  const brand = 'Arkians Collectibles';
  const countries = Object.freeze([
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
    'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  ]);
  const availabilityValues = new Set([
    'BackOrder', 'Discontinued', 'InStock', 'InStoreOnly', 'LimitedAvailability',
    'OnlineOnly', 'OutOfStock', 'PreOrder', 'PreSale', 'SoldOut',
  ]);
  const stockLabels = {
    InStock: ['product_in_stock', 'Available', 'Διαθέσιμο'],
    OutOfStock: ['product_out_of_stock', 'Out of stock', 'Εξαντλημένο'],
    SoldOut: ['product_sold_out', 'Sold out', 'Εξαντλήθηκε'],
    Discontinued: ['product_discontinued', 'No longer available', 'Δεν διατίθεται πλέον'],
    InStoreOnly: ['product_in_store_only', 'Available in store only', 'Διαθέσιμο μόνο στο κατάστημα'],
    LimitedAvailability: ['product_limited_availability', 'Limited availability', 'Περιορισμένη διαθεσιμότητα'],
    OnlineOnly: ['product_online_only', 'Available online only', 'Διαθέσιμο μόνο διαδικτυακά'],
    BackOrder: ['product_back_order', 'Available on backorder', 'Διαθέσιμο κατόπιν παραγγελίας'],
    PreOrder: ['product_pre_order', 'Available for pre-order', 'Διαθέσιμο για προπαραγγελία'],
    PreSale: ['product_pre_sale', 'Available for pre-sale', 'Διαθέσιμο για προπώληση'],
  };
  const onlineOffers = new Set(['InStock', 'LimitedAvailability', 'OnlineOnly', 'BackOrder', 'PreOrder', 'PreSale']);
  const name = product => `${product.name} (${product.colored === false ? 'Uncoloured' : 'Coloured'})`;
  const description = product => product.description ||
    `A collectible ${product.colored === false ? 'uncoloured' : 'coloured'} €2 coin from ${product.country}, issued in ${product.year}.`;
  const title = product => `${name(product)} | ${brand}`;
  const url = id => {
    if (!Number.isSafeInteger(Number(id)) || Number(id) < 1 || !/^[1-9]\d*$/.test(String(id))) {
      throw Error(`Invalid product ID: ${id}`);
    }
    return `${domain}product-${id}.html`;
  };
  function availability(product) {
    const value = product.availability ?? 'InStock';
    const short = String(value).replace(/^https:\/\/schema\.org\//, '');
    if (!availabilityValues.has(short)) throw Error(`Invalid product availability: ${value}`);
    return `https://schema.org/${short}`;
  }
  function stockStatus(product) {
    const [key, en, el] = stockLabels[availability(product).slice('https://schema.org/'.length)];
    return { key, en, el };
  }
  const canPurchase = product => onlineOffers.has(availability(product).slice('https://schema.org/'.length));
  function validateGTIN(value) {
    // Keep leading zeroes. A checksum verifies the format, not ownership or
    // assignment: only add a GTIN verified from the actual item/issuer.
    if (typeof value !== 'string' || !/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value) || /^0+$/.test(value)) {
      throw Error('GTIN must be a string of 8, 12, 13, or 14 digits');
    }
    let sum = 0;
    for (let index = value.length - 2, weight = 3; index >= 0; index--, weight = weight === 3 ? 1 : 3) {
      sum += Number(value[index]) * weight;
    }
    if ((10 - sum % 10) % 10 !== Number(value.at(-1))) throw Error(`Invalid GTIN checksum: ${value}`);
    return value;
  }
  function optionalText(value, field) {
    if (typeof value !== 'string' || !value.trim()) throw Error(`Invalid product ${field}`);
    return value.trim();
  }
  function returnPolicy() {
    return {
      '@type': 'MerchantReturnPolicy',
      '@id': domain + 'returns.html#return-policy',
      applicableCountry: [...countries],
      returnPolicyCountry: 'GR',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: 14,
      returnMethod: 'https://schema.org/ReturnByMail',
      returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
      merchantReturnLink: domain + 'returns.html',
    };
  }
  function shippingService(catalog) {
    if (!Number.isSafeInteger(catalog?.shipping_cents) || catalog.shipping_cents < 0) {
      throw Error('Invalid shipping amount');
    }
    return {
      '@type': 'ShippingService',
      '@id': domain + 'terms.html#shipping-policy',
      name: 'EU Shipping',
      description: 'Flat-rate delivery to supported European Union destinations.',
      fulfillmentType: 'https://schema.org/FulfillmentTypeDelivery',
      shippingConditions: {
        '@type': 'ShippingConditions',
        shippingRate: { '@type': 'MonetaryAmount', value: (catalog.shipping_cents / 100).toFixed(2), currency: 'EUR' },
        shippingDestination: countries.map(addressCountry => ({ '@type': 'DefinedRegion', addressCountry })),
      },
      // The published 3–10 business days are a total estimate. The standard
      // ShippingService format allows a rate without an invented time split.
    };
  }
  function schema(product, id, catalog, imageURL) {
    if (!product?.name || !Number.isSafeInteger(product.price_cents) || product.price_cents < 0) {
      throw Error(`Invalid product metadata: ${id}`);
    }
    if (!Number.isSafeInteger(catalog?.shipping_cents) || catalog.shipping_cents < 0) {
      throw Error('Invalid shipping amount');
    }
    const canonical = url(id);
    const result = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': canonical + '#product',
      name: name(product), description: description(product), sku: String(id), url: canonical,
      offers: {
        '@type': 'Offer', url: canonical, priceCurrency: 'EUR',
        price: (product.price_cents / 100).toFixed(2),
        availability: availability(product),
        seller: { '@type': 'Organization', '@id': domain + '#organization', name: brand, url: domain },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          hasShippingService: { '@id': domain + 'terms.html#shipping-policy' },
        },
        hasMerchantReturnPolicy: returnPolicy(),
      },
    };
    if (imageURL) {
      const image = new URL(imageURL, domain);
      if (image.protocol !== 'https:') throw Error('Product images must use HTTPS');
      result.image = image.href;
    }
    if (product.brand !== undefined) result.brand = { '@type': 'Brand', name: optionalText(product.brand, 'brand') };
    if (product.mpn !== undefined) result.mpn = optionalText(product.mpn, 'mpn');
    if (product.gtin !== undefined) {
      const gtin = validateGTIN(product.gtin);
      result[`gtin${gtin.length}`] = gtin;
    }
    for (const length of [8, 12, 13, 14]) {
      const field = `gtin${length}`;
      if (product[field] === undefined) continue;
      const gtin = validateGTIN(product[field]);
      if (gtin.length !== length) throw Error(`Invalid ${field} length`);
      if (result[field] && result[field] !== gtin) throw Error(`Conflicting ${field} identifiers`);
      result[field] = gtin;
    }
    // No identifier, brand, condition, rating, or price expiry is invented.
    return result;
  }
  function buildProduct({ product, id, catalog, imageURL }) {
    return {
      name: name(product), description: description(product), title: title(product),
      canonical: url(id), schema: schema(product, id, catalog, imageURL),
    };
  }
  globalThis.ARKIANS_PRODUCT_SEO = Object.freeze({
    countries, domain, name, description, title, url, availability, stockStatus, canPurchase,
    validateGTIN, returnPolicy, shippingService, schema, buildProduct,
  });
})();
