/* Landometer Design System 0.9.4 candidate — MotionController (component.motion-controller.01; MOTION-04, MOTIF-03, A11Y-01, CTRL-01)
   The single page-level pause/resume control that every MotifFrame (and any other OWNER-MOTION-01 replay) subscribes to.
   Pause holds every subscriber at its complete final state; resume restarts cycles only for subscribers that are still at
   least 14% visible. It never hides content and never persists the paused state beyond the page.

   Markup (one per page, before the first MotifFrame in reading order or in the page utility bar):
     <button class="lds-motion-pause" type="button" aria-pressed="false"
             data-label-pause="หยุดการเคลื่อนไหว · Pause motion" data-label-resume="เล่นต่อ · Resume motion">หยุดการเคลื่อนไหว · Pause motion</button>
   API: window.LandometerMotion = { pause(), resume(), toggle(), paused, subscribe(fn) → unsubscribe, reducedMotion, contract }
   Subscribers receive ({ paused, reducedMotion, hidden }) on every change and once on subscribe. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.LandometerMotion) return;
  var CONTRACT = { componentId: 'component.motion-controller.01', authority: 'OWNER-MOTION-01 (2026-09-11) via LDS 0.9.4 MOTION-04', onePerPage: true, persistsAcrossPages: false };
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var state = { paused: false, reducedMotion: !!(mq && mq.matches), hidden: document.visibilityState === 'hidden' };
  var subscribers = [];
  function snapshot() { return { paused: state.paused, reducedMotion: state.reducedMotion, hidden: state.hidden }; }
  function notify() { var s = snapshot(); subscribers.slice().forEach(function (fn) { try { fn(s); } catch (e) { if (window.console) console.error('[LandometerMotion] subscriber failed', e); } }); }
  function buttons() { return Array.prototype.slice.call(document.querySelectorAll('.lds-motion-pause')); }
  function reflect() {
    buttons().forEach(function (b) {
      b.setAttribute('aria-pressed', state.paused ? 'true' : 'false');
      var label = b.getAttribute(state.paused ? 'data-label-resume' : 'data-label-pause');
      if (label) b.textContent = label;
    });
  }
  function setPaused(next) { next = !!next; if (state.paused === next) return; state.paused = next; reflect(); notify(); }
  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    subscribers.push(fn);
    try { fn(snapshot()); } catch (e) { if (window.console) console.error('[LandometerMotion] subscriber failed', e); }
    return function () { var i = subscribers.indexOf(fn); if (i >= 0) subscribers.splice(i, 1); };
  }
  document.addEventListener('visibilitychange', function () { state.hidden = document.visibilityState === 'hidden'; notify(); });
  window.addEventListener('pagehide', function () { state.hidden = true; notify(); });
  if (mq) { try { mq.addEventListener('change', function (ev) { state.reducedMotion = ev.matches; notify(); }); } catch (e) { try { mq.addListener(function (ev) { state.reducedMotion = ev.matches; notify(); }); } catch (e2) {} } }
  document.addEventListener('click', function (ev) { var b = ev.target && ev.target.closest && ev.target.closest('.lds-motion-pause'); if (b) setPaused(!state.paused); });
  function init() {
    var n = buttons().length;
    if (n > 1 && window.console) console.error('[LandometerMotion] ' + n + ' .lds-motion-pause controls found; the contract allows one per page');
    reflect();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.LandometerMotion = {
    contract: CONTRACT,
    pause: function () { setPaused(true); },
    resume: function () { setPaused(false); },
    toggle: function () { setPaused(!state.paused); },
    subscribe: subscribe,
    get paused() { return state.paused; },
    get reducedMotion() { return state.reducedMotion; },
    get hidden() { return state.hidden; },
    controlCount: function () { return buttons().length; }
  };
})();
