# Uncoloured coin photographs

Source: European Central Bank, https://www.ecb.europa.eu/euro/coins/comm/html/index.en.html.
Copyright © European Central Bank. Reuse conditions: https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html.

Files other than 022.jpg and 027.png are original JPEG files from the ECB catalogue. 022.jpg is the official Marine Nationale 2026 obverse photograph from Monnaie de Paris; 027.png is the official Bremen 2026 image from Münze Deutschland. Their exact original asset URLs and product pages are recorded with the products, and their respective source credits appear on the website. Names match the three-digit identifiers of the corresponding coloured coins. Exact image URLs and annual catalogue pages are recorded as image_source_url and image_source_page in supabase/functions/_shared/product-prices.json.

The website uses image_bounds, image_frame and the shared coin_image_reference to match the measured coin outline and placement of the coloured photos. It rectifies the displayed face geometry and masks the background/sidewall with an ellipse. The source image pixels are unchanged. The appropriate source credit is displayed with each image. This layout correction does not increase the source photograph's sharpness; higher-resolution, frontal replacement photographs are still needed for consistent detail quality.

For replacement photographs, update image_bounds and image_frame to reflect the new photo's bounds, or remove both to use the standard square, contain layout. image_frame percentages are relative to the masked face container. Remove/change the source fields and credit implementation if the photograph has a different source. Do not reuse an old source credit for your own photo.
