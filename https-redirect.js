/* Prefer the verified HTTPS origin, including bookmarks that still use HTTP.
 * Hosting-level Enforce HTTPS remains necessary to redirect before any HTML.
 */
(() => {
  if (location.protocol === 'http:' && ['arkianscollectibles.com', 'www.arkianscollectibles.com'].includes(location.hostname)) {
    const destination = new URL(location.href);
    destination.protocol = 'https:';
    destination.hostname = 'arkianscollectibles.com';
    location.replace(destination.href);
  }
})();
