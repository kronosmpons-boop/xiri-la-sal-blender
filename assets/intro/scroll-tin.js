/* Entry point. lite-check.js (in <head>) already decided. Only the 3D path downloads three.js (~2 MB),
   the model (3 MB) and the lettering; weak devices get the plain page straight away. */
const $ = s => document.querySelector(s);
const root = document.documentElement;

function plainSite() {
  const website = $('.tin-website'), intro = $('.tin-intro'), portal = $('.tin-portal-window');
  const spacer = $('.tin-spacer'), slot = $('.tin-web-slot'), loader = $('#xiri-loader');
  if (loader) { loader.classList.add('out'); setTimeout(() => loader.remove(), 500); }
  if (spacer) spacer.style.height = '0px';
  if (portal) portal.remove();                       // frees the iframe copy of the page
  if (intro) intro.classList.add('tin-finished');
  if (website) { website.classList.add('tin-live'); website.inert = false; website.removeAttribute('aria-hidden'); }
  if (slot) slot.style.minHeight = '';

  // Same contract as the 3D intro: the page's GSAP effects start on 'xiri:intro-ready'
  const start = () => requestAnimationFrame(() => dispatchEvent(new CustomEvent('xiri:intro-ready')));
  const settle = () => {
    const restore = window.__xiriRestore;            // position kept when switching language
    if (restore) {
      delete window.__xiriRestore;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const section = document.getElementById(restore.id);
        if (!section) return;
        const curtain = root.classList.contains('cortina');
        if (curtain) root.classList.remove('cortina');
        const y = section.getBoundingClientRect().top + scrollY + restore.dy;
        if (curtain) root.classList.add('cortina');
        scrollTo({ top: y, behavior: 'instant' });
      }));
      return;
    }
    const anchor = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (anchor && website && website.contains(anchor)) {
      requestAnimationFrame(() => { anchor.scrollIntoView(); scrollBy(0, -($('#nav')?.offsetHeight || 0)); });
    }
  };
  if (document.readyState === 'complete') { start(); settle(); }
  else addEventListener('load', () => { start(); settle(); }, { once: true });
}

if (root.classList.contains('lite') || matchMedia('(prefers-reduced-motion: reduce)').matches) plainSite();
else import('/assets/intro/scroll-tin-3d.js').catch(error => { console.error('Xiri La Sal:', error); root.classList.add('lite'); plainSite(); });
