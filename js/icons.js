/* Yolk product icon subset. DS ICON-01 style; canonical DS font bytes are unchanged. */
(function (global) {
  'use strict';
  const glyphs = Object.freeze(["ac_unit", "add", "add_photo_alternate", "arrow_back", "beach_access", "bedtime", "bookmark_add", "bookmark_added", "close", "contrast", "dark_mode", "delete", "edit", "egg_alt", "explore", "fact_check", "flag", "groups", "help", "history", "layers", "light_mode", "local_gas_station", "location_on", "map", "menu", "notifications", "open_in_new", "photo", "potted_plant", "satellite_alt", "save", "search", "share", "shield", "arrow_forward", "store", "swords", "tune"]);
  const allowed = new Set(glyphs);
  // The owner's selected Google Outlined storefront (400) is a scoped shop-only
  // exception. Its exact path/viewBox are retained; the other 39 font glyphs stay intact.
  const storefrontPath = 'M841-518v318q0 33-23.5 56.5T761-120H201q-33 0-56.5-23.5T121-200v-318q-23-21-35.5-54t-.5-72l42-136q8-26 28.5-43t47.5-17h556q27 0 47 16.5t29 43.5l42 136q12 39-.5 71T841-518Zm-272-42q27 0 41-18.5t11-41.5l-22-140h-78v148q0 21 14 36.5t34 15.5Zm-180 0q23 0 37.5-15.5T441-612v-148h-78l-22 140q-4 24 10.5 42t37.5 18Zm-178 0q18 0 31.5-13t16.5-33l22-154h-78l-40 134q-6 20 6.5 43t41.5 23Zm540 0q29 0 42-23t6-43l-42-134h-76l22 154q3 20 16.5 33t31.5 13ZM201-200h560v-282q-5 2-6.5 2H751q-27 0-47.5-9T663-518q-18 18-41 28t-49 10q-27 0-50.5-10T481-518q-17 18-39.5 28T393-480q-29 0-52.5-10T299-518q-21 21-41.5 29.5T211-480h-4.5q-2.5 0-5.5-2v282Zm560 0H201h560Z';
  function icon(name) {
    if (name === 'store') return '<span class="yl-icon yolk-storefront-icon" aria-hidden="true" data-yolk-glyph="store" data-yolk-symbol="storefront"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24" height="24" aria-hidden="true" focusable="false"><path d="'+storefrontPath+'"/></svg></span>';
    return allowed.has(name) ? '<span class="yl-icon" aria-hidden="true" data-yolk-glyph="'+name+'">'+name+'</span>' : '';
  }
  const patternGlyphs = Object.freeze({'Crowded':'groups','FOMO':'flag','Our Farm':'potted_plant','Pioneer':'explore','Quiet':'bedtime','Their War':'swords','Our Island':'beach_access','Winter War':'ac_unit'});
  function patternIcon(name) { return Object.prototype.hasOwnProperty.call(patternGlyphs,name) ? icon(patternGlyphs[name]) : ''; }
  function yolkIcon() { return icon('egg_alt'); }
  // Demand uses the very same fried-egg graphic as the retained Yolk letter O.
  // This only adds a semantic hook; glyph artwork, font bytes and axes stay intact.
  function demandIcon() { return yolkIcon().replace('class="yl-icon"', 'class="yl-icon yolk-demand-icon" data-yolk-semantic="demand"'); }
  // Three retained eggs distinguish the opportunity collection from one Demand egg.
  function opportunityIcon() { return '<span class="yl-icon yolk-opportunity-icon" data-yolk-semantic="opportunity" aria-hidden="true">'+yolkIcon()+yolkIcon()+yolkIcon()+'</span>'; }
  function yolkWordmark() { return '<span class="yolk-wordmark" role="img" aria-label="Yolk"><b aria-hidden="true">Y</b><i class="yolk-letter-o" aria-hidden="true">'+yolkIcon()+'</i><b aria-hidden="true">lk</b></span>'; }
  // Optional explicit enhancement only. Existing labels, children and handlers remain intact.
  function decorate(root) {
    root = root || global.document;
    if (!root || !root.querySelectorAll) return 0;
    let count = 0;
    root.querySelectorAll('[data-yolk-icon]').forEach(function (el) {
      const name = el.getAttribute('data-yolk-icon');
      if (!allowed.has(name) || el.querySelector('.yl-icon')) return;
      el.insertAdjacentHTML('afterbegin', icon(name));
      count++;
    });
    return count;
  }
  function captionControls(root) {
    root=root||global.document; if(!root?.querySelectorAll)return;
    for(const control of root.querySelectorAll('button,a,summary')){
      if(!control.querySelector('.yl-icon')||control.querySelector('.yolk-wordmark'))continue;
      control.classList.add('has-caption-icon');
      const wrap=node=>{for(const child of [...node.childNodes]){if(child.nodeType===3&&child.textContent.trim()){const span=child.ownerDocument.createElement('span');span.className='control-caption';child.replaceWith(span);span.appendChild(child);}else if(child.nodeType===1&&!child.matches('.yl-icon,.control-caption,[data-yolk-counter],svg,img'))wrap(child);}};wrap(control);
    }
  }
  function load() {
    const doc = global.document;
    if (!doc || !doc.fonts || !doc.fonts.load || !doc.documentElement) return Promise.resolve(false);
    return doc.fonts.load('300 24px "Yolk Material Symbols"', 'map save tune').then(function (faces) {
      const ready = faces.length > 0;
      doc.documentElement.classList.toggle('yolk-icons-ready', ready);
      return ready;
    }).catch(function () {
      doc.documentElement.classList.remove('yolk-icons-ready');
      return false;
    });
  }
  global.YolkIcons = Object.freeze({ icon: icon, decorate: decorate, captionControls: captionControls, load: load, glyphs: glyphs, patternGlyphs: patternGlyphs, patternIcon: patternIcon, yolkIcon: yolkIcon, demandIcon: demandIcon, opportunityIcon: opportunityIcon, yolkWordmark: yolkWordmark });
  // Failed fonts leave readable labels; no raw ligature names or fallback emoji appear.
  load();
})(typeof window !== 'undefined' ? window : globalThis);
