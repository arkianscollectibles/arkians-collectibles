# Clean-finish uncoloured coin images

These 30 AI-retouched illustrations use the original uncoloured catalogue images as references. The shop owner approved the Barbara sample and requested the same clean, newly minted appearance for all existing uncoloured products on 6 October 2026. Fine relief and engraving may differ from a physical coin; these are edited catalogue illustrations, not photographs of the shop's individual stock.

The owner then selected the retouched Slava Ukraini image (`017.png`, product 54) as the shared champagne-gold colour reference. That reference remains unchanged; the other 29 images have been colour matched to it. Their `-slava-gold.png` filenames also avoid browser caches retaining the previous versions.

The originals remain unchanged in `../UNCOLORED/`. Their source credits and URLs remain in `supabase/functions/_shared/product-prices.json`. The website labels the edited images as AI retouched and retains the original source attribution. `manifest.json` records each product, original, replacement and measured bounds.

Images retain their generated PNG pixels. The shared display frame maps their measured outlines to the same coin diameter and position as the coloured images across listings, search, product pages, cart and wishlist. File names follow the corresponding coloured coin identifiers, for example `001-slava-gold.png` for Barbara.

To use your own stock photograph, change the product's `image` in the shared catalogue, remove `image_edit`, update source attribution, and recalculate `image_bounds` / `image_frame` for that photograph. To restore the previous image, use `image_original` and restore its bounds from Git history. Run `node scripts/build-seo.mjs` followed by `node scripts/build-prices.mjs` after catalogue edits.
