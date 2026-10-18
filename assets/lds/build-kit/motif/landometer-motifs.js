/* Landometer motion motifs — v3 · 6 September 2026
   <lm-motif kind="dial|slice|rings|layers|cultivate|logo" [quiet] [ink="sky|mint|yellow|beige|blue"] [replay="once|enter|hover"] [loop="ms"] [autoplay="false"] [run="n"]></lm-motif>
   Renders an inline SVG in its FINAL state (fail-open). When the element scrolls into view it plays once by default;
   replay="enter" replays on every re-entry, replay="hover" on pointerenter, loop="ms" repeats while in view;
   change the `run` attribute (or call el.play()) to replay programmatically. Requires landometer-motifs.css.
   The motifs are decoration: the element is aria-hidden and never carries data, copy or a control. */
(function () {
  'use strict';
  if (typeof window === 'undefined' || (window.customElements && window.customElements.get('lm-motif'))) return;

  var C = {
    coral: 'var(--energy-coral,#FF5A5F)', yellow: 'var(--energy-yellow,#FFBC1F)',
    mint: 'var(--energy-mint,#0AD69C)', sky: 'var(--energy-sky,#59D2FE)'
  };
  var SVG_OPEN = '<svg viewBox="0 0 600 300" aria-hidden="true" focusable="false">';

  function stroke(d, color, width, cls, delay, opacity) {
    return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + width + '"' +
      (opacity ? ' stroke-opacity="' + opacity + '"' : '') +
      ' stroke-dasharray="90" class="' + cls + '" style="--lm-delay:' + delay + 'ms"></path>';
  }

  var build = {
    /* dial — วัดก่อน แล้วจึงตัดสินใจ: the gauge fills segment by segment like a needle sweeping (each arc draws while it
       rotates in from −12° about the dial centre), the final sky reading clicks in with a pulse, the baseline confirms */
    dial: function (q) {
      var w = q ? 6 : 34, op = q ? 0.4 : 0, ink = 'currentColor';
      var segs = [
        ['M187 200 A113 113 0 0 1 220.10 120.10', C.coral, 0, op],
        ['M220.10 120.10 A113 113 0 0 1 300 87', C.yellow, 150, op],
        ['M300 87 A113 113 0 0 1 379.90 120.10', C.mint, 300, op],
        ['M379.90 120.10 A113 113 0 0 1 413 200', C.sky, 450, 0]
      ].map(function (s, i) {
        var p = stroke(s[0], q ? ink : s[1], w, 'lm-draw lm-sweep', s[2], s[3]);
        return i === 3 ? '<g class="lm-pulse" style="--lm-delay:840ms">' + p + '</g>' : p;
      }).join('');
      return SVG_OPEN + segs +
        '<rect x="170" y="210" width="260" height="' + (q ? 2 : 8) + '" fill="currentColor" class="lm-growx-c" style="--lm-delay:700ms"></rect></svg>';
    },
    /* slice — ชิ้นที่ต้องทำก่อน: the whole pops into view, then the priority slice wriggles free and steps out */
    slice: function (q) {
      var disc = q ? 'fill="none" stroke="currentColor" stroke-width="2" stroke-opacity=".4"' : 'fill="currentColor"';
      var slice = q ? 'fill="currentColor" fill-opacity=".56"' : 'fill="' + C.sky + '"';
      return SVG_OPEN +
        '<path d="M300 150 L396 150 A96 96 0 1 1 300 54 Z" ' + disc + ' class="lm-disc lm-radiate"></path>' +
        '<path d="M300 150 L396 150 A96 96 0 0 0 300 54 Z" ' + slice + ' class="lm-step"></path></svg>';
    },
    /* rings — มิติของพื้นที่แผ่จากที่ตั้งจริง (Land · Location · Living): the place lands first, then each layer of
       context ripples outward in turn. Quiet: the outline stays; layers fill with the ink, thinning outward until the
       outermost is empty */
    rings: function (q) {
      var cls = 'lm-radial ' + (q ? 'lm-approach' : 'lm-radiate');
      function ring(d, color, delay, fo) {
        var paint = q ? (fo ? 'fill="currentColor" fill-opacity="' + fo + '"' : 'fill="none"') + ' stroke="currentColor" stroke-width="1.5" stroke-opacity=".4"' : 'fill="' + color + '"';
        return '<path d="' + d + '" ' + paint + ' class="' + cls + '" style="--lm-delay:' + delay + 'ms"></path>';
      }
      return SVG_OPEN +
        ring('M80 30 A230 230 0 0 1 310 260 L270 260 A190 190 0 0 0 80 70 Z', C.sky, 900, 0) +
        ring('M80 80 A180 180 0 0 1 260 260 L220 260 A140 140 0 0 0 80 120 Z', C.mint, 750, .24) +
        ring('M80 130 A130 130 0 0 1 210 260 L170 260 A90 90 0 0 0 80 170 Z', C.yellow, 600, .48) +
        ring('M80 180 A80 80 0 0 1 160 260 L120 260 A40 40 0 0 0 80 220 Z', C.coral, 450, .72) +
        '<path d="M80 230 A30 30 0 0 1 110 260 L80 260 Z" fill="currentColor" class="lm-drop" style="--lm-delay:0ms"></path></svg>';
    },
    /* layers — หลายชั้นข้อมูลซ้อนกันจนเห็นภาพเดียว: the base extends, four sheets land on it one by one, the translucent
       layers settle inside. Quiet: nine discs unfold from the centre, filled thinner the further out — the two outermost
       are outline only */
    layers: function (q) {
      if (q) {
        function disc(cx, delay, fo) {
          return '<circle cx="' + cx + '" cy="142" r="42" ' + (fo ? 'fill="currentColor" fill-opacity="' + fo + '"' : 'fill="none"') + ' stroke="currentColor" stroke-opacity=".56" stroke-width="1.5" class="lm-unfold" style="--lm-dx:' + (300 - cx) + 'px;--lm-delay:' + delay + 'ms"></circle>';
        }
        return SVG_OPEN + disc(300, 0, .72) + disc(250.5, 150, .54) + disc(349.5, 150, .54) + disc(201, 300, .36) + disc(399, 300, .36) + disc(151.5, 450, .18) + disc(448.5, 450, .18) + disc(102, 600, 0) + disc(498, 600, 0) + '</svg>';
      }
      function top(x, color, delay) { return '<rect x="' + x + '" y="100" width="120" height="20" fill="' + color + '" class="lm-land" style="--lm-delay:' + delay + 'ms"></rect>'; }
      function inner(x, color) { return '<rect x="' + x + '" y="148" width="108" height="36" fill="' + color + '"></rect>'; }
      return SVG_OPEN +
        '<rect x="60" y="120" width="480" height="64" fill="currentColor" class="lm-growx" style="--lm-dur:920ms;--lm-ease:var(--motion-ease-settle,cubic-bezier(.2,.9,.25,1.08))"></rect>' +
        top(60, C.coral, 300) + top(180, C.yellow, 420) + top(300, C.mint, 540) + top(420, C.sky, 660) +
        '<g fill-opacity=".56" class="lm-settle">' + inner(84, C.coral) + inner(192, C.yellow) + inner(300, C.mint) + inner(408, C.sky) + '</g></svg>';
    },
    /* cultivate — Let us cultivate our city with data: a seed of data lands, roots reach down in the four colours, a shoot
       breaks through and the seedling sways once. Quiet: a row of seedlings springs up, each swaying as it lands */
    cultivate: function (q) {
      if (q) {
        function sprout(x, hgt, delay, last) {
          return '<g stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none" stroke-opacity="' + (last ? 1 : 0.56) + '" class="lm-sway" style="transform-origin:' + x + 'px 200px;--lm-delay:' + (delay + 420) + 'ms">' +
            '<path d="M' + x + ' 200 V' + (200 - hgt) + '" class="lm-growy" style="--lm-delay:' + delay + 'ms"></path>' +
            '<path d="M' + x + ' ' + (200 - hgt) + ' L' + (x - 10) + ' ' + (182 - hgt) + ' M' + x + ' ' + (200 - hgt) + ' L' + (x + 10) + ' ' + (182 - hgt) + '" stroke-dasharray="90" class="lm-draw" style="--lm-delay:' + (delay + 240) + 'ms"></path></g>';
        }
        return SVG_OPEN +
          '<rect x="120" y="199" width="360" height="2" fill="currentColor" class="lm-growx-c"></rect>' +
          sprout(180, 28, 300) + sprout(240, 40, 450) + sprout(300, 52, 600) + sprout(360, 64, 750) + sprout(420, 76, 900, true) + '</svg>';
      }
      var shoot = function (d) { return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="90" class="lm-draw" style="--lm-delay:1200ms"></path>'; };
      var roots = [
        ['M200 150 A100 100 0 0 0 229.29 220.71', C.coral, 600],
        ['M229.29 220.71 A100 100 0 0 0 300 250', C.yellow, 750],
        ['M300 250 A100 100 0 0 0 370.71 220.71', C.mint, 900],
        ['M370.71 220.71 A100 100 0 0 0 400 150', C.sky, 1050]
      ].map(function (s) { return stroke(s[0], s[1], 16, 'lm-draw', s[2], 0); }).join('');
      return SVG_OPEN +
        '<rect x="120" y="149" width="360" height="2" fill="currentColor" class="lm-growx-c"></rect>' +
        '<g class="lm-sway" style="transform-origin:300px 150px;--lm-delay:1500ms">' +
        '<circle cx="300" cy="140" r="9" fill="currentColor" class="lm-drop" style="--lm-delay:120ms"></circle>' +
        shoot('M300 131 L288 106') + shoot('M300 131 L312 106') + '</g>' + roots + '</svg>';
    },
    /* logo assembly — owner-approved exception to "the official logo never animates":
       the mark's PARTS assemble once; the official artwork file itself is never animated,
       and the assembled state never replaces the official logo in nav, favicon or OG images. */
    logo: function (q) {
      /* geometry measured from the official mark (6402px master, centre (3202,3049), outer r 2600 → 128 units):
         centre (300,143) · outer ring r 99–128 · band r 71–99 at .8 over the pin · head r 71 · body = r 99 disc to 27°
         below the baseline, then a fitted cubic to the tip (300,286) · priority wedge = sector 0°–45° r 71
         v3 character (owner rules, 5 September 2026): only the mark's own parts appear — no extra shapes of any kind.
         The pin falls in and lands on its tip with squash & stretch; the four colour pieces are laid down one after another
         like translucent sheets (the mark grew out of overlapping layers); the wedge pops in; then the finale — the three
         sky layers (wedge 36 · band 45 · outer ring 54 units — equal 9-unit gaps at full stretch) step forward together along their 22.5° bisector, each its own
         distance and beat, and settle back: amid all the data, Landometer points at the part to act on.
         Quiet: the three sky pieces start as pure outlines, then fill with the ink at graded opacity (wedge .88 · band .56 ·
         ring .24 — the full mark's hierarchy in one ink) one after another from the inside out, the same order the finale
         steps them forward, and stay filled at rest; fills are stroke-less
         paths, so at rest every edge is still drawn exactly once. For the finale, two hidden CLOSED frames (band, outer ring)
         swap in for the resting lines they replace, so each moving piece is a closed outline of its own; they swap back as
         the pieces settle. Transient transforms and opacity only; the resting markup is the final state. */
      var pin = 'M201 143 A99 99 0 0 1 399 143 A99 99 0 0 1 388.21 187.95 C367.78 228.04 328.12 265.17 300 286 C271.88 265.17 232.22 228.04 211.79 187.95 A99 99 0 0 1 201 143 Z';
      var wedge = 'M300 143 L371 143 A71 71 0 0 0 350.2 92.8 Z';
      var f = function (n) { return (Math.round(n * 100) / 100).toString(); };
      var pt = function (r, a) { var t = a * Math.PI / 180; return f(300 + r * Math.cos(t)) + ' ' + f(143 - r * Math.sin(t)); };
      var focus = function (inner, dist, delay, extra) {
        var t = 22.5 * Math.PI / 180;
        return '<g class="lm-focus" style="--lm-fx:' + f(dist * Math.cos(t)) + 'px;--lm-fy:' + f(-dist * Math.sin(t)) + 'px;' + (extra || '') + '--lm-delay:' + delay + 'ms">' + inner + '</g>';
      };
      var WEDGE_X = '--lm-fs:1.06;--lm-fr:3deg;', i;
      if (q) {
        var SW = '--lm-swap-delay:2340ms;--lm-swap-dur:1020ms;';
        var line = function (d, len, delay, dur, cls, extra) { return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="' + len + '" class="lm-drawv' + (cls ? ' ' + cls : '') + '" style="--lm-dash:' + len + ';--lm-dur:' + dur + 'ms;--lm-delay:' + delay + 'ms;' + (extra || '') + '"></path>'; };
        var frame = function (d) { return '<path d="' + d + '" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0" class="lm-show" style="' + SW + '"></path>'; };
        // stroke-less fill of a sky piece: rests at --lm-fo, fades in from 0 before the finale
        var fill = function (d, fo, delay) { return '<path d="' + d + '" fill="currentColor" fill-opacity="' + fo + '" stroke="none" class="lm-fill" style="--lm-fo:' + fo + ';--lm-fill-delay:' + delay + 'ms"></path>'; };
        var RING = 'M399 143 H428 A128 128 0 0 0 390.51 52.49 L370 73 A99 99 0 0 1 399 143 Z';
        var BAND = 'M371 143 H399 A99 99 0 0 0 370 73 L350.2 92.8 A71 71 0 0 1 371 143 Z';
        return SVG_OPEN +
          // resting lines — the pin outline carries the whole r 99 head edge; arcs r 128 / r 71 run 180°→45°; the 45° divider
          // from r 71 to r 128 is the mint pieces' edge; baseline only where the mark has an edge (never inside the head, x 229–300)
          '<path d="' + pin + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="700" class="lm-pin-q" style="--lm-dash:700"></path>' +
          line('M172 143 A128 128 0 0 1 390.51 52.49', 302, 820, 420) +
          line('M229 143 A71 71 0 0 1 350.2 92.8', 168, 960, 420) +
          line('M172 143 H229', 57, 1030, 300) +
          line('M249.8 92.8 L209.49 52.49', 57, 1150, 300) +
          line('M300 72 V15', 57, 1150, 300) +
          line('M350.2 92.8 L390.51 52.49', 57, 1150, 300) +
          // resting edges owned only by the sky band / sky outer ring — hidden while their closed frames move
          line('M371 143 H399', 28, 1150, 300, 'lm-hide', SW) +
          line('M399 143 H428 A128 128 0 0 0 390.51 52.49', 130, 1150, 420, 'lm-hide', SW) +
          // the three moving pieces: each a stroke-less fill (visible at rest) plus its own closed outline
          focus(fill(RING, .24, 1930) + frame(RING), 54, 2460) +
          focus(fill(BAND, .56, 1690) + frame(BAND), 45, 2400) +
          focus('<path d="' + wedge + '" fill="currentColor" fill-opacity=".88" stroke="currentColor" stroke-width="1.5" class="lm-wedge lm-fill" style="--lm-delay:1300ms;--lm-fo:.88;--lm-fill-delay:1450ms"></path>', 36, 2340, WEDGE_X) + '</svg>';
      }
      // full: OPAQUE annular strokes. Each later segment starts .25° early over the previous one, the band runs to r 100
      // under the outer ring and the wedge to r 71.6 over the band, so no anti-aliasing seam can open in the final state.
      // Band colour = energy 80% over the ink (measured on the mark). Bands paint before rings; the outer and band of one
      // colour share a delay, origin and slide direction (radially inward along the piece's bisector), so they land as one sheet.
      var seg = function (r, i, paint) {
        var a1 = 180 - 45 * i + (i ? .25 : 0), a2 = 135 - 45 * i, t = (157.5 - 45 * i) * Math.PI / 180;
        return '<path d="M' + pt(r, a1) + ' A' + r + ' ' + r + ' 0 0 1 ' + pt(r, a2) + '" fill="none" stroke-width="29" class="lm-pop" style="' + paint + ';--lm-dx:' + f(22 * Math.cos(t)) + 'px;--lm-dy:' + f(-22 * Math.sin(t)) + 'px;--lm-delay:' + (600 + 80 * i) + 'ms"></path>';
      };
      var cols = [C.coral, C.yellow, C.mint, C.sky];
      var band = function (i) { return seg(85.5, i, 'stroke:color-mix(in srgb, ' + cols[i] + ' 80%, currentColor)'); };
      var ring = function (i) { return seg(113.5, i, 'stroke:' + cols[i]); };
      var out = '<path d="' + pin + '" fill="currentColor" class="lm-pin"></path>';
      for (i = 0; i < 3; i++) out += band(i);
      out += focus(band(3), 45, 1910);
      for (i = 0; i < 3; i++) out += ring(i);
      out += focus(ring(3), 54, 1970);
      out += focus('<path d="M300 143 L371.6 143 A71.6 71.6 0 0 0 350.63 92.37 Z" fill="var(--lm-wedge, #3F93D1)" class="lm-wedge" style="--lm-delay:1150ms"></path>', 36, 1850, WEDGE_X);
      return SVG_OPEN + out + '</svg>';
    }
  };

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var io = null;
  function observer() {
    if (io || !('IntersectionObserver' in window)) return io;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        el._inView = e.isIntersecting;
        if (!e.isIntersecting) { clearTimeout(el._loop); return; }
        if (el.getAttribute('replay') !== 'enter' && !el.hasAttribute('loop')) io.unobserve(el);
        el.play();
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -12% 0px' });
    return io;
  }

  class LmMotif extends HTMLElement {
    static get observedAttributes() { return ['kind', 'quiet', 'run']; }
    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');
      this.render();
      if (this.getAttribute('replay') === 'hover' && !this._hover) { this._hover = this.play.bind(this); this.addEventListener('pointerenter', this._hover); }
      if (reduced || this.getAttribute('autoplay') === 'false') return;
      var o = observer();
      if (o) o.observe(this);
    }
    disconnectedCallback() { if (io) io.unobserve(this); clearTimeout(this._loop); }
    attributeChangedCallback(name, oldValue, newValue) {
      if (!this.isConnected || oldValue === newValue) return;
      if (name === 'run') { this.play(); return; }
      this.render();
    }
    render() {
      var kind = this.getAttribute('kind');
      var fn = build[kind] || build.dial;
      this.innerHTML = fn(this.hasAttribute('quiet'));
    }
    play() {
      if (reduced) return;
      this.removeAttribute('data-play');
      void this.offsetWidth; // restart CSS animations
      this.setAttribute('data-play', '');
      clearTimeout(this._loop);
      if (this.hasAttribute('loop') && this._inView !== false) {
        var self = this, ms = Math.max(2000, parseInt(this.getAttribute('loop'), 10) || 4000);
        this._loop = setTimeout(function () { self.play(); }, ms);
      }
    }
  }
  window.customElements.define('lm-motif', LmMotif);
  window.LandometerMotifs = { svg: function (kind, quiet) { return (build[kind] || build.dial)(!!quiet); }, kinds: Object.keys(build) };
})();
