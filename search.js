/* Search the complete catalogue, independent of the current page/category. */
(() => {
  const greek = {α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o'};
  const normalize = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[α-ω]/g, letter => greek[letter] || letter).replace(/[^a-z0-9]+/g, '');
  const categories = {
    coins: {key:'nav_coins', aliases:'Coins Coin Κέρματα Κέρμα Νομίσματα', url:'coins.html'},
    cards: {key:'nav_cards', aliases:'CoinCard CoinCards Coin Card Cards Κάρτες Νομισμάτων', url:'cards.html'},
    proof: {key:'nav_proof', aliases:'Proof Proofs Προοφ Προυφ', url:'proof.html'}
  };
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('globalSearchResults');
    if (!container) return;
    const query = (new URLSearchParams(location.search).get('search') || '').trim();
    const tokens = query.split(/\s+/).map(normalize).filter(Boolean);
    const products = [
      ...coins.map(product => ({product, type:'coins'})),
      ...Object.entries(window.ARKIANS_CATALOGS || {}).flatMap(([type, list]) =>
        list.map(product => ({product, type})))
    ];
    const matches = tokens.length ? products.filter(({product, type}) => {
      const countryKey = `country_${product.country?.toLowerCase()}`;
      const fields = [product.name, product.nameEl, ...(product.searchAliases || []), product.country,
        window.ARKIANS_TRANSLATIONS.el[countryKey], product.year, categories[type]?.aliases].map(normalize);
      return tokens.every(token => fields.some(field => field.includes(token)));
    }) : [];
    const summary = document.getElementById('searchSummary');
    const renderSummary = () => {
      const strings = window.ARKIANS_TRANSLATIONS[document.documentElement.lang] || window.ARKIANS_TRANSLATIONS.en;
      summary.textContent = !tokens.length ? strings.search_empty : !matches.length
        ? `${strings.search_none} «${query}»` : `${matches.length} ${strings.search_found} «${query}»`;
    };
    // Language changes update the heading and summary without losing the search.
    new MutationObserver(renderSummary).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
    renderSummary();
    matches.forEach(({product,type}) => {
      const category = categories[type];
      const link = document.createElement('a');
      link.className = 'coin-card search-result';
      link.href = type === 'coins' ? `product.html?id=${encodeURIComponent(product.id)}`
        : `${category.url}#product-${encodeURIComponent(product.id)}`;
      const image = document.createElement('img');
      image.className = 'coin-card-image'; image.alt = product.name;
      image.addEventListener('error', () => { image.src = 'PRODUCT PHOTOS/product-placeholder.svg'; }, {once:true});
      image.src = product.image;
      const title = document.createElement('div'); title.className = 'coin-card-title'; title.textContent = product.name;
      const label = document.createElement('div'); label.className = 'coin-card-meta'; label.dataset.i18n = category.key;
      const meta = document.createElement('div'); meta.className = 'coin-card-meta'; meta.textContent = `${product.country} · ${product.year}`;
      const price = document.createElement('div'); price.className = 'coin-card-price';
      if (type === 'coins') price.textContent = `€${product.price.toFixed(2)}`;
      else price.dataset.i18n = 'coming_soon';
      link.append(image,title,label,meta,price); container.appendChild(link);
    });
    window.arkiansTranslate?.();
  });
})();
