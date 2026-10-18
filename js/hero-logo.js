// Artifact-local opening: play the exact quiet logo once, then hold its supplied final SVG.
// The owner selected no pause control; this is not the repeating LDS MotifFrame lifecycle.
const host = document.querySelector('.hero-motif[data-motion-mode="finite_once"]');
const logo = host?.querySelector('lm-motif');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const printMedia = window.matchMedia('print');
const FINAL_HOLD_MS = 3400; // Quiet v3 ends at 3360 ms; never truncate the final beat.
let consumed = false;
let timer;
let observer;

function finish() {
  clearTimeout(timer);
  host.dataset.logoMotion = 'final';
  logo.removeAttribute('data-play');
}

function interrupt() {
  if (host?.dataset.logoMotion === 'playing') {
    consumed = true;
    finish();
  }
}

if (host && logo && window.customElements && 'IntersectionObserver' in window) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) interrupt();
  });
  window.addEventListener('pagehide', interrupt);
  window.addEventListener('beforeprint', interrupt);
  reducedMotion.addEventListener('change', event => {
    if (event.matches) interrupt();
  });
  printMedia.addEventListener('change', event => {
    if (event.matches) interrupt();
  });

  // Failure to define/upgrade leaves the complete source fallback visible.
  customElements.whenDefined('lm-motif').then(() => {
    // Deferred/module execution follows stylesheet loading. A failed stylesheet has no sheet.
    const styles = document.querySelector('link[href="./assets/lds/build-kit/motif/landometer-motifs.css"]');
    if (!host.isConnected || !styles?.sheet || styles.disabled || !logo.querySelector('svg') || typeof logo.play !== 'function') return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.14;
        if (!visible) {
          interrupt();
          continue;
        }
        if (consumed || document.hidden || reducedMotion.matches || printMedia.matches) continue;
        consumed = true;
        logo.play();
        host.dataset.logoMotion = 'playing';
        timer = setTimeout(finish, FINAL_HOLD_MS);
      }
    }, { threshold: 0.14, rootMargin: '0px 0px -12% 0px' });
    observer.observe(host);
  });
}
