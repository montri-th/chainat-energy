/* Scoped adaptation of the retained Yolk icon API and the shared disclosure contract.
   Opening a menu, choosing a theme and following a link do not create team activity. */
(function () {
  'use strict';
  const doc = document;
  const api = window.YolkIcons;
  if (api) {
    doc.querySelectorAll('[data-icon]').forEach(el => {
      const name = el.dataset.icon;
      el.innerHTML = name === 'demand' ? api.demandIcon() : name === 'opportunity' ? api.opportunityIcon() : api.icon(name);
    });
    doc.querySelectorAll('[data-yolk-wordmark]').forEach(el => { el.innerHTML = api.yolkWordmark(); });
  }
  const trigger = doc.getElementById('nav-trigger');
  const panel = doc.getElementById('nav-panel');
  if (!trigger || !panel) return;
  function close(restore) {
    if (panel.hidden) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (restore) trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', () => {
    if (!panel.hidden) { close(true); return; }
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    panel.querySelector('a,button,select')?.focus({ preventScroll: true });
  });
  doc.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(true); }
  });
  doc.addEventListener('click', e => {
    if (panel.hidden || trigger.contains(e.target)) return;
    if (!panel.contains(e.target)) { close(false); return; }
    if (e.target.closest('a')) close(false);
  });
  doc.addEventListener('focusin', e => {
    if (!panel.hidden && !panel.contains(e.target) && !trigger.contains(e.target)) close(false);
  });
  window.addEventListener('popstate', () => close(false));
  trigger.hidden = false;
})();
