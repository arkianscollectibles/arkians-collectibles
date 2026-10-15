/* Original photograph cards share the Coins page's country/year/colour filters. */
(() => {
  const photographs = window.ARKIANS_PHOTO_CATALOG || [];
  window.arkiansFilterPhotoGallery = ({ countries, years, colours, query }) => {
    const gallery = document.querySelector('.coin-gallery');
    if (!gallery) return 0;
    let count = 0;
    for (const photo of photographs) {
      const card = document.getElementById(`photo-${photo.id}`);
      if (!card) continue;
      const matches = (!countries.length || countries.includes(photo.country)) &&
        (!years.length || years.includes(photo.year)) &&
        (!colours.length || colours.includes(photo.colored ? 'yes' : 'no')) &&
        (!query || [photo.name, photo.nameEl, ...(photo.searchAliases || []), photo.country, photo.year]
          .some(value => String(value ?? '').toLowerCase().includes(query)));
      card.hidden = !matches;
      if (matches) count++;
    }
    gallery.hidden = count === 0;
    return count;
  };
  window.arkiansCreatePhotoFrame = photo => {
    const frame = document.createElement('span');
    frame.className = 'coin-gallery-image';
    if (photo.image_edit === 'ai-retouched') frame.classList.add('coin-gallery-image-retouched');
    for (const [key, value] of Object.entries(photo.display)) {
      frame.style.setProperty(`--gallery-image-${key}`, `${value}%`);
    }
    const image = document.createElement('img');
    image.className = 'coin-card-image';
    image.src = photo.image;
    image.alt = photo.name;
    image.width = photo.pixels[0];
    image.height = photo.pixels[1];
    image.loading = 'lazy';
    frame.append(image);
    return frame;
  };
})();
