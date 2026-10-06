# PDF catalogue import

Imported the 37 named rows from COINS ALL. Blank rows 38–111 are not products.
All supplied prices are €14.99 and shipping remains €3.00.
IDs 1–37 preserve the PDF identifiers. ID 3 retains year 2019, which is visible on the supplied photo 003.jpg; the PDF says 2015. ID 5 uses 2026, visible on 005.jpg (100 years of the Academy of Athens), rather than the PDF's 2015.
Images use the existing numbered convention PRODUCT PHOTOS/COINS/001.jpg through 037.jpg.
The source PDF uses labels such as 0_2_9, mapped to 029.jpg.
The local checkout has photos 001–028. Upload 029–037 to finish the coloured catalogue; missing images show a neutral placeholder.
30 matching non-coloured editions have been added: 28 original photographs from the European Central Bank plus the 2026 Marine Nationale and Bremen images from their official mints, Monnaie de Paris and Münze Deutschland. Their IDs are the corresponding coloured ID plus 37, their prices are €14.99, and they use the same country/year filters with colored=false. IDs for the remaining 7 editions are reserved in non-coloured-plan.json. These are not activated with guessed images.

Uncoloured photos are stored in PRODUCT PHOTOS/COINS/UNCOLORED, with the same three-digit source numbering. The original files are preserved, including their original resolutions. image_frame specifies their display bounds: the coin occupies 94% of a square frame and is centred. coin-photos.js applies that layout consistently to catalogue, search, product, cart and wishlist images. It does not repaint, stretch or invent a coin design. Each photograph displays its source credit; individual source URLs and catalogue pages are stored with the product.

Remaining matches: Sipsik, Academy of Athens, Poblet, Rotary, Energy Independence, Ivan Cankar and Exodus of Missolonghi (all 2026). The ECB 2026 catalogue returned 404 during research. The remaining national issuing authorities returned access denials, or link to separate mint hosts denied by the cloud network policy. Access to Monnaie de Paris and Münze Deutschland succeeded, and their two 2026 images have been added. The required destinations have been saved in the environment draft for Save/Publish before continuing research.
The shared source includes country, year, colored, image, name and price_cents; app.js reads it and checkout uses its server copy.
