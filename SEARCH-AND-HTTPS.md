# HTTPS και εμφάνιση στο Google

Το domain παραμένει `arkianscollectibles.com`. Ο κώδικας χρησιμοποιεί HTTPS για τους εξωτερικούς πόρους και τα canonical URLs. Αυτό δεν εκδίδει πιστοποιητικό και δεν αντικαθιστά τη ρύθμιση HTTPS του GitHub Pages.

## Πρώτα HTTPS

1. Άνοιξε [GitHub → Settings → Pages](https://github.com/arkianscollectibles/arkians-collectibles/settings/pages), με λογαριασμό που έχει δικαίωμα αλλαγής αυτών των ρυθμίσεων.
2. Το Custom domain πρέπει να παραμείνει `arkianscollectibles.com`.
3. Ενεργοποίησε **Enforce HTTPS**, όταν είναι διαθέσιμο. Αυτή η ρύθμιση ανακατευθύνει τις επισκέψεις HTTP σε HTTPS.
4. Έλεγξε το `https://arkianscollectibles.com` και ότι το `http://arkianscollectibles.com` ανακατευθύνει σε αυτό.

Αν το Enforce HTTPS είναι ανενεργό/γκρι, χρειάζεται να εξεταστεί το μήνυμα ελέγχου DNS ή έκδοσης πιστοποιητικού στη σελίδα Pages. Αν ο browser προειδοποιεί και στο HTTPS, χρειάζεται το ακριβές σφάλμα πιστοποιητικού για διάγνωση. Δεν αλλάζουμε το custom domain ή τις εγγραφές DNS χωρίς να ελέγξουμε την υπάρχουσα κατάσταση. Το περιβάλλον Codex δεν μπόρεσε να ελέγξει το ζωντανό πιστοποιητικό ή τις ρυθμίσεις Pages λόγω περιορισμών πρόσβασης· δεν έχει επιβεβαιωθεί από εδώ ότι το HTTPS είναι ενεργό.

## Google Search Console

Η εμφάνιση στα αποτελέσματα γίνεται μέσω ανίχνευσης και ευρετηρίασης· δεν είναι διαδικασία έγκρισης καταστήματος. Η Google αποφασίζει αν και πότε θα ευρετηριάσει τις σελίδες, καθώς και την κατάταξή τους.

1. Μετά την ενεργοποίηση HTTPS και τη δημοσίευση των αρχείων SEO, άνοιξε το [Google Search Console](https://search.google.com/search-console) με εταιρικό ή ξεχωριστό Google λογαριασμό για το κατάστημα.
2. Επίλεξε **Add property → URL prefix** και βάλε ακριβώς `https://arkianscollectibles.com/`.
3. Για επαλήθευση, επίλεξε **HTML tag** και χρησιμοποίησε το πραγματικό `google-site-verification` meta tag που δίνει η Google μέσα στο `<head>` του `index.html`. Εναλλακτικά, ανέβασε στον φάκελο ρίζας το HTML verification file που παρέχει η Google, χωρίς αλλαγή ονόματος ή περιεχομένου. Δημοσίευσε την αλλαγή στο live repository και πάτησε **Verify**. Τα αρχεία επαλήθευσης δεν δημιουργούνται εδώ χωρίς τον πραγματικό κωδικό/αρχείο της ιδιοκτησίας.
4. Στο **Sitemaps**, πρόσθεσε `sitemap.xml` και πάτησε **Submit**. Πλήρης διεύθυνση: `https://arkianscollectibles.com/sitemap.xml`.
5. Στο **URL inspection**, έλεγξε το `https://arkianscollectibles.com/` και πάτησε **Request indexing**, εφόσον επιτρέπεται. Έλεγξε επίσης το `https://arkianscollectibles.com/coins.html`.

Οι σύνδεσμοι sitemap/canonical χρησιμοποιούν το υπάρχον domain. Δεν απαιτείται αλλαγή DNS για τη μέθοδο URL prefix με HTML verification. Η υποβολή απαιτεί τον Google λογαριασμό του ιδιοκτήτη· δεν έχει γίνει από το Codex.

## Συντήρηση SEO

Τα `scripts/build-seo.mjs` και `seo.js` προσθέτουν περιγραφές, canonical URLs, στοιχεία κοινοποίησης, δεδομένα WebSite/Organization και δυναμικά δεδομένα Product από τον ίδιο κατάλογο τιμών. Οι πραγματικές φωτογραφίες προϊόντων προστίθενται στα δομημένα δεδομένα μόνο αφού φορτωθούν επιτυχώς. Δεν δηλώνονται ανύπαρκτες κριτικές ή διαθέσιμο απόθεμα.

Το sitemap περιλαμβάνει 8 δημόσιες σελίδες και 67 ενεργά προϊόντα. Λογαριασμός, καλάθι, αγαπημένα, προσωπικά στοιχεία, ιστορικό, ολοκλήρωση παραγγελίας, αναζήτηση και άγνωστα προϊόντα έχουν `noindex`. Αυτό είναι οδηγία για μηχανές αναζήτησης, όχι έλεγχος πρόσβασης στα δεδομένα πελατών.

Μετά από προσθήκη προϊόντων ή αλλαγή στοιχείων SEO:

```powershell
node scripts/build-seo.mjs
node scripts/build-prices.mjs
node scripts/build-seo.mjs --check
node scripts/build-prices.mjs --check
```

Οι σελίδες προϊόντων χρησιμοποιούν JavaScript για την απόδοση περιεχομένου και των ειδικών metadata ανά ID. Ο έλεγχος ζωντανής URL του Search Console χρειάζεται για να επιβεβαιωθεί ότι η Google αποδίδει το περιεχόμενο σωστά. Τα αρχεία `robots.txt` και οι πόροι JavaScript παραμένουν ανιχνεύσιμα.
