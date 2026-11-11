/* ==========================================================================
   Trofeos y Reconocimientos Urreys — «La Ceremonia»
   JS propio (sin dependencias) + anime.js 3.2.2 como mejora opcional.
   Principio: el contenido es visible por defecto; todo efecto se puede caer
   sin que la página quede vacía (cada módulo va aislado en try/catch).
   ========================================================================== */

/* Número de WhatsApp: UNA sola constante. Formato: 52 + 10 dígitos.
   Si queda vacío, se ocultan el botón flotante y el envío del formulario. */
const WHATSAPP_NUMBER = "526143693229";

(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const safe = (fn, nombre) => { try { return fn(); } catch (e) { console.warn('[Urreys] ' + nombre, e); return null; } };
  const WA = String(WHATSAPP_NUMBER || '').replace(/\D/g, '');

  /* ------------------------------------------------------------------
     1. WHATSAPP · enlaces, flotante y etiqueta
     ------------------------------------------------------------------ */
  const waUrl = (msg) => 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);

  safe(() => {
    $$('[data-wa]').forEach((a) => {
      if (WA) {
        a.href = waUrl(a.dataset.wa);
        a.target = '_blank';
        a.rel = 'noopener';
      } else if (a.classList.contains('nav-cta') || a.classList.contains('menu-cta') || a.id === 'waFloat') {
        a.setAttribute('data-wa-oculto', '');
      }
    });
    const flot = $('#waFloat');
    if (flot && WA) {
      setTimeout(() => {
        flot.classList.add('abierta');
        setTimeout(() => flot.classList.remove('abierta'), 3800);
      }, 6000);
    }
  }, 'whatsapp');

  /* ------------------------------------------------------------------
     2. CARGADOR · se acuña la medalla (≤ 2.5 s, con respaldo CSS)
     ------------------------------------------------------------------ */
  safe(() => {
    const c = $('#cargador');
    const liberar = () => { root.classList.remove('cargando'); if (c) c.classList.add('fuera'); };
    if (!c) { liberar(); return; }
    const num = $('#cargaNum');
    const set = (v) => { if (num) num.textContent = String(Math.round(v)).padStart(3, '0'); };
    const DUR = 1450;
    if (reduce) {
      set(100);
      setTimeout(() => c.classList.add('sale'), 150);
      setTimeout(liberar, 450);
    } else {
      if (window.anime) {
        const o = { v: 0 };
        window.anime({ targets: o, v: 100, duration: DUR, easing: 'easeInOutQuad', update: () => set(o.v) });
      } else {
        const t0 = performance.now();
        (function paso(t) {
          const k = clamp((t - t0) / DUR);
          set(100 * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2));
          if (k < 1) requestAnimationFrame(paso); else set(100);
        })(t0);
      }
      setTimeout(() => c.classList.add('sale'), 1560);
      setTimeout(liberar, 2330);
    }
    setTimeout(liberar, 2500); // seguro final
  }, 'cargador');

  /* ------------------------------------------------------------------
     3. MENÚ MÓVIL
     ------------------------------------------------------------------ */
  safe(() => {
    const b = $('#burger'), m = $('#menu');
    if (!b || !m) return;
    const abrir = (v) => {
      m.classList.toggle('abierto', v);
      m.setAttribute('aria-hidden', String(!v));
      b.setAttribute('aria-expanded', String(v));
      b.setAttribute('aria-label', v ? 'Cerrar menú' : 'Abrir menú');
      root.classList.toggle('menu-abierto', v);
    };
    b.addEventListener('click', () => abrir(!m.classList.contains('abierto')));
    $$('a', m).forEach((a) => a.addEventListener('click', () => abrir(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && m.classList.contains('abierto')) { abrir(false); b.focus(); } });
    window.addEventListener('resize', () => { if (window.innerWidth >= 900) abrir(false); });
  }, 'menu');

  /* ------------------------------------------------------------------
     4. REVELADOS (IntersectionObserver + respaldo por geometría)
     ------------------------------------------------------------------ */
  let alRevelarPodio = null;
  const pendientes = new Set();
  const revelar = (el) => {
    if (!pendientes.has(el)) return;
    pendientes.delete(el);
    const d = el.dataset.delay;
    if (d) el.style.transitionDelay = d + 'ms';
    if (el.id === 'podium' && alRevelarPodio) safe(alRevelarPodio, 'podio');
    el.classList.add('in');
  };
  const barrer = () => {
    const vh = window.innerHeight;
    pendientes.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.94) revelar(el); // dentro de la ventana o ya superado
    });
  };

  /* ------------------------------------------------------------------
     5. MOTOR DE SCROLL ÚNICO
     ------------------------------------------------------------------ */
  const hooks = {};
  const scrubs = $$('[data-scrub]').map((el) => ({ el, modo: el.dataset.scrub, hook: el.dataset.hook, ultimo: -1 }));
  const nav = $('#nav');
  const riel = $$('#riel a');
  const seccionesRiel = riel.map((a) => ({ a, el: document.getElementById(a.dataset.sec) })).filter((s) => s.el);
  let ticking = false;
  let matCheck = null, nodosCheck = null;

  const calcP = (modo, r, vh) => {
    switch (modo) {
      case 'pin': { const total = r.height - vh; return total <= 0 ? 1 : clamp(-r.top / total); }
      case 'out': return clamp(-r.top / Math.max(1, r.height));
      case 'view': return clamp((vh - r.top) / (vh + r.height));
      case 'line': return clamp((vh * 0.62 - r.top) / Math.max(1, r.height));
      default: return 0;
    }
  };

  function actualizar() {
    ticking = false;
    try {
      const y = window.scrollY || window.pageYOffset || 0;
      const vh = window.innerHeight;
      const max = Math.max(1, root.scrollHeight - vh);
      root.style.setProperty('--scroll', clamp(y / max).toFixed(4));
      if (nav) nav.classList.toggle('compacto', y > 40);

      for (const s of scrubs) {
        const r = s.el.getBoundingClientRect();
        const p = calcP(s.modo, r, vh);
        if (Math.abs(p - s.ultimo) > 0.0004) {
          s.ultimo = p;
          s.el.style.setProperty('--p', p.toFixed(4));
          if (s.hook && hooks[s.hook]) hooks[s.hook](p);
        }
      }
      if (seccionesRiel.length) {
        let activo = 0;
        seccionesRiel.forEach((s, i) => { if (s.el.getBoundingClientRect().top <= vh * 0.45) activo = i; });
        seccionesRiel.forEach((s, i) => s.a.classList.toggle('activo', i === activo));
      }
      if (matCheck) matCheck();
      if (nodosCheck) nodosCheck();
    } catch (e) {
      console.warn('[Urreys] motor de scroll desactivado', e);
      root.classList.remove('motor'); // vuelve todo a su estado visible por defecto
    }
  }
  const pedir = () => { if (!ticking) { ticking = true; requestAnimationFrame(actualizar); } };

  /* ------------------------------------------------------------------
     6. MÓDULOS
     ------------------------------------------------------------------ */

  /* 6.1 Manifiesto: cada palabra se ilumina */
  safe(() => {
    const h = $('[data-frase]');
    if (!h) return;
    const palabras = [];
    const recorrer = (nodo) => {
      Array.from(nodo.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) frag.appendChild(document.createTextNode(' '));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = t; frag.appendChild(s); palabras.push(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) recorrer(n);
      });
    };
    recorrer(h);
    let prev = -1;
    hooks.manifiesto = (p) => {
      const n = Math.ceil(clamp(p / 0.8) * palabras.length);
      if (n === prev) return;
      prev = n;
      palabras.forEach((w, i) => w.classList.toggle('on', i < n));
    };
    if (reduce) hooks.manifiesto(1);
  }, 'manifiesto');

  /* 6.2 Vitrina: carril horizontal ligado al scroll (escritorio) / snap (móvil) */
  safe(() => {
    const pin = $('#vitPin'), rail = $('#carril');
    if (!pin || !rail) return;
    const cards = $$('.card', rail), num = $('#vitNum'), bar = $('#vitBarra');
    const mq = window.matchMedia('(min-width: 900px)');
    let rec = 0, idx = -1, pActual = 0;
    const horizontal = () => mq.matches && !reduce && root.classList.contains('motor');
    function medir() {
      if (horizontal()) {
        rail.style.transform = '';
        rec = Math.max(0, rail.offsetWidth - window.innerWidth);
        pin.style.setProperty('--pinh', Math.round(rec + window.innerHeight) + 'px');
      } else {
        pin.style.removeProperty('--pinh');
        rail.style.transform = '';
        rec = 0;
      }
    }
    function aplicar(p) {
      pActual = p;
      let q = p;
      if (horizontal()) rail.style.transform = 'translate3d(' + (-p * rec).toFixed(1) + 'px,0,0)';
      else { const m = rail.scrollWidth - rail.clientWidth; q = m > 0 ? rail.scrollLeft / m : 0; }
      if (bar) bar.style.transform = 'scaleX(' + Math.max(0.04, q).toFixed(3) + ')';
      const i = Math.min(cards.length - 1, Math.max(0, Math.round(q * (cards.length - 1))));
      if (i !== idx) {
        idx = i;
        if (num) { num.textContent = String(i + 1).padStart(2, '0'); num.classList.remove('cambio'); void num.offsetWidth; num.classList.add('cambio'); }
        cards.forEach((c, k) => c.classList.toggle('activa', k === i));
      }
    }
    hooks.vitrina = aplicar;
    rail.addEventListener('scroll', () => { if (!horizontal()) aplicar(pActual); }, { passive: true });
    const remedir = () => { medir(); aplicar(pActual); pedir(); };
    window.addEventListener('resize', remedir);
    window.addEventListener('load', remedir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remedir);
    medir();
    aplicar(0);

    // inclinación 3D + reflejo que sigue al cursor
    if (finePointer && !reduce) {
      cards.forEach((c) => {
        c.addEventListener('pointermove', (e) => {
          const r = c.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          c.style.setProperty('--ry', ((x - .5) * 16).toFixed(2) + 'deg');
          c.style.setProperty('--rx', ((.5 - y) * 16).toFixed(2) + 'deg');
          c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
        c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
      });
    }
  }, 'vitrina');

  /* 6.3 Materiales: escenas que se funden según el paso activo */
  safe(() => {
    const sec = $('#materiales');
    const pasos = $$('.pmat'), capas = $$('.capa'), puntos = $$('.mat-marca i');
    if (!sec || !pasos.length) return;
    let cur = -1;
    const poner = (i) => {
      if (i === cur) return;
      cur = i;
      pasos.forEach((p, k) => p.classList.toggle('on', k === i));
      capas.forEach((c, k) => c.classList.toggle('on', k === i));
      puntos.forEach((d, k) => d.classList.toggle('on', k === i));
    };
    poner(0);
    matCheck = () => {
      const vh = window.innerHeight;
      const rs = sec.getBoundingClientRect();
      if (rs.bottom < 0 || rs.top > vh) return;
      const ref = window.innerWidth >= 900 ? vh * 0.5 : vh * 0.68;
      let mejor = 0, dist = Infinity;
      pasos.forEach((p, k) => {
        const r = p.getBoundingClientRect();
        const d = Math.abs((r.top + r.bottom) / 2 - ref);
        if (d < dist) { dist = d; mejor = k; }
      });
      poner(mejor);
    };
  }, 'materiales');

  /* 6.4 Proceso: nodos que se encienden al pasar la línea */
  safe(() => {
    const nodos = $$('.nodo');
    if (!nodos.length) return;
    nodosCheck = () => {
      const vh = window.innerHeight;
      nodos.forEach((n) => {
        const r = $('.punto', n).getBoundingClientRect();
        n.classList.toggle('on', r.top + r.height / 2 < vh * 0.64);
      });
    };
    if (reduce) nodos.forEach((n) => n.classList.add('on'));
  }, 'proceso');

  /* 6.5 Sello: el texto aparece al abrirse el portal */
  safe(() => {
    const t = $('#selloTxt');
    if (!t) return;
    hooks.sello = (p) => t.classList.toggle('on', p > 0.55);
    if (reduce) t.classList.add('on');
  }, 'sello');

  /* 6.6 Banda: velocidad e inclinación reaccionan al scroll */
  safe(() => {
    if (reduce) return;
    const sec = $('#banda');
    if (!sec) return;
    const filas = $$('.banda-fila', sec).map((f) => ({ t: $('.banda-track', f), dir: Number(f.dataset.dir) || -1, pos: 0, w: 0 }));
    const medir = () => filas.forEach((f) => { f.w = f.t.scrollWidth / 2; });
    medir();
    window.addEventListener('resize', medir);
    window.addEventListener('load', medir);
    let visible = false, lastY = window.scrollY, v = 0;
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(sec);
    root.classList.add('manejada');
    (function bucle() {
      const y = window.scrollY;
      const dy = y - lastY; lastY = y;
      v += (dy - v) * 0.1;
      if (visible && !document.hidden) {
        const vel = 1.1 + Math.min(Math.abs(v) * 0.35, 14);
        const skew = clamp(-v * 0.35, -6, 6);
        filas.forEach((f) => {
          if (!f.w) return;
          f.pos += f.dir * vel;
          f.pos = ((f.pos % f.w) + f.w) % f.w - f.w;
          f.t.style.transform = 'translate3d(' + f.pos.toFixed(1) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
        });
      }
      requestAnimationFrame(bucle);
    })();
  }, 'banda');

  /* ------------------------------------------------------------------
     7. HERO
     ------------------------------------------------------------------ */
  // 7.1 letras del título (la animación es CSS; esto solo parte el texto)
  safe(() => {
    let i = 0;
    $$('#tituloHero .pal:not(.pal-oro)').forEach((p) => {
      const t = p.textContent;
      p.textContent = '';
      Array.from(t).forEach((c) => {
        const s = document.createElement('span');
        s.className = 'ch';
        s.style.setProperty('--i', i++);
        s.textContent = c;
        p.appendChild(s);
      });
    });
  }, 'letras');

  // 7.2 línea rotatoria tipo tragamonedas
  safe(() => {
    const s = $('#slot');
    if (!s) return;
    const frases = ['equipo campeón', 'generación graduada', 'mejor colaborador', 'torneo', 'alumno destacado'];
    let actual = $('.slot-in', s), i = 0;
    s.style.width = actual.offsetWidth + 'px';
    s.classList.add('js-slot');
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { s.style.width = actual.offsetWidth + 'px'; });
    if (reduce) return;
    setInterval(() => {
      if (document.hidden) return;
      i = (i + 1) % frases.length;
      const nuevo = document.createElement('span');
      nuevo.className = 'slot-in entra';
      nuevo.textContent = frases[i];
      s.appendChild(nuevo);
      s.style.width = nuevo.offsetWidth + 'px';
      const viejo = actual;
      viejo.classList.remove('entra');
      viejo.classList.add('sale');
      actual = nuevo;
      setTimeout(() => viejo.remove(), 700);
    }, 2400);
  }, 'slot');

  // 7.3 moneda 3D que sigue al puntero + 7.4 partículas
  safe(() => {
    const hero = $('#inicio');
    const tilt = $('#coinTilt');
    let heroVisible = true;
    new IntersectionObserver((es) => { heroVisible = es[0].isIntersecting; }, { threshold: 0 }).observe(hero);

    let mx = null, my = null;
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
    }, { passive: true });

    if (tilt && !reduce) {
      let cx = 0, cy = 0;
      (function bucle(t) {
        if (heroVisible && !document.hidden) {
          let tx, ty;
          if (mx !== null && finePointer) {
            ty = ((mx / window.innerWidth) - .5) * 24;
            tx = -((my / window.innerHeight) - .5) * 24;
          } else {
            const s = t / 1000;
            ty = Math.sin(s * .7) * 9;
            tx = Math.cos(s * .5) * 6;
          }
          cx += (tx - cx) * .06; cy += (ty - cy) * .06;
          tilt.style.transform = 'rotateX(' + cx.toFixed(2) + 'deg) rotateY(' + cy.toFixed(2) + 'deg)';
        }
        requestAnimationFrame(bucle);
      })(0);
    }

    const cv = $('#particulas');
    if (!cv || reduce) return;
    const ctx = cv.getContext('2d');
    let W = 1, H = 1, dpr = 1, parts = [];
    const N = window.innerWidth < 700 ? 28 : 70;
    const nueva = (ini) => ({
      x: Math.random() * W, y: ini ? Math.random() * H : H + 20 * dpr,
      s: (Math.random() * 3 + 1.4) * dpr, v: (Math.random() * .35 + .12) * dpr,
      ph: Math.random() * 6.28, tw: Math.random() * .03 + .01, estrella: Math.random() < .55, ox: 0, oy: 0
    });
    const medir = () => {
      const r = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.width = Math.max(1, Math.round(r.width * dpr));
      H = cv.height = Math.max(1, Math.round(r.height * dpr));
      if (!parts.length) for (let i = 0; i < N; i++) parts.push(nueva(true));
    };
    medir();
    window.addEventListener('resize', medir);
    (function dibujar() {
      if (heroVisible && !document.hidden) {
        ctx.clearRect(0, 0, W, H);
        let px = -9999, py = -9999;
        if (mx !== null) { const r = cv.getBoundingClientRect(); px = (mx - r.left) * dpr; py = (my - r.top) * dpr; }
        for (const p of parts) {
          p.y -= p.v; p.ph += p.tw;
          const dx = p.x + p.ox - px, dy = p.y + p.oy - py, d = Math.hypot(dx, dy), rad = 130 * dpr;
          if (d < rad && d > 0.1) { const f = (1 - d / rad) * 2.2 * dpr; p.ox += dx / d * f; p.oy += dy / d * f; }
          p.ox *= .95; p.oy *= .95;
          if (p.y < -30 * dpr) Object.assign(p, nueva(false));
          const a = .3 + .7 * (Math.sin(p.ph) * .5 + .5);
          const x = p.x + p.ox, y = p.y + p.oy;
          ctx.globalAlpha = a;
          ctx.fillStyle = p.estrella ? '#FFF1B8' : '#F3D27A';
          ctx.beginPath();
          if (p.estrella) {
            const s = p.s * 1.8;
            ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
            ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
          } else ctx.arc(x, y, p.s * .38, 0, 6.283);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(dibujar);
    })();
  }, 'hero-fx');

  /* ------------------------------------------------------------------
     8. CONFETI (canvas propio, sin librería)
     ------------------------------------------------------------------ */
  function crearConfeti(canvas) {
    const ctx = canvas.getContext('2d');
    const colores = ['#D4A32E', '#F3D27A', '#FFF1B8', '#FFFFFF', '#B3202F', '#7A0F1E'];
    let parts = [], raf = 0, W = 1, H = 1, dpr = 1;
    function size() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.width = Math.max(1, Math.round(r.width * dpr));
      H = canvas.height = Math.max(1, Math.round(r.height * dpr));
    }
    const pieza = (x, y, vx, vy) => ({
      x, y, vx, vy, w: (6 + Math.random() * 7) * dpr, h: (3 + Math.random() * 5) * dpr,
      r: Math.random() * 6.28, vr: (Math.random() - .5) * .3, c: colores[(Math.random() * colores.length) | 0],
      t: 0, life: 200 + Math.random() * 140, sw: Math.random() * 6.28
    });
    function lanzar(fn, n) {
      if (reduce) return;
      size();
      for (let i = 0; i < n; i++) parts.push(fn());
      if (!raf) raf = requestAnimationFrame(bucle);
    }
    function bucle() {
      ctx.clearRect(0, 0, W, H);
      parts = parts.filter((p) => p.t < p.life && p.y < H + 40 * dpr);
      for (const p of parts) {
        p.t++;
        p.vy = Math.min(p.vy + .11 * dpr, 5.5 * dpr);
        p.vx *= .992;
        p.sw += .06;
        p.x += p.vx + Math.sin(p.sw) * .8 * dpr;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.globalAlpha = clamp((p.life - p.t) / 40);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.sw)) + 1);
        ctx.restore();
      }
      if (parts.length) raf = requestAnimationFrame(bucle);
      else { raf = 0; ctx.clearRect(0, 0, W, H); }
    }
    return {
      lluvia(n) { lanzar(() => pieza(Math.random() * W, -20 * dpr - Math.random() * H * .3, (Math.random() - .5) * 2 * dpr, (1.5 + Math.random() * 2.5) * dpr), n); },
      estalla(n, x, y) {
        lanzar(() => {
          const a = Math.random() * Math.PI * 2, s = (4 + Math.random() * 9) * dpr;
          return pieza(x * dpr, y * dpr, Math.cos(a) * s, Math.sin(a) * s - 6 * dpr);
        }, n);
      }
    };
  }

  // confeti de graduación: al entrar y cada 12 s mientras la sección esté visible
  safe(() => {
    const sec = $('#graduacion'), cv = $('#confetiGrad');
    if (!sec || !cv || reduce) return;
    const cf = crearConfeti(cv);
    let timer = 0, primera = true;
    new IntersectionObserver((es) => {
      if (es[0].isIntersecting) {
        if (primera) { primera = false; setTimeout(() => cf.lluvia(120), 350); }
        if (!timer) timer = setInterval(() => { if (!document.hidden) cf.lluvia(60); }, 12000);
      } else if (timer) { clearInterval(timer); timer = 0; }
    }, { threshold: 0.35 }).observe(sec);
  }, 'confeti-graduacion');

  /* ------------------------------------------------------------------
     9. PODIO · medallas que caen (anime.js si existe; si no, keyframes CSS)
     ------------------------------------------------------------------ */
  alRevelarPodio = () => {
    const pod = $('#podium');
    if (!window.anime || reduce || !pod) return;
    const orden = [$('.l2 .medalla-p', pod), $('.l3 .medalla-p', pod), $('.l1 .medalla-p', pod)].filter(Boolean);
    try {
      window.anime.set(orden, { opacity: 0, translateY: -340, rotate: -360 });
      pod.classList.add('anime');
      orden.forEach((m, i) => window.anime({ targets: m, translateY: 0, rotate: 0, opacity: [0, 1], duration: 1500, delay: 900 + i * 250, easing: 'easeOutBounce' }));
      setTimeout(() => orden.forEach((m) => { if (getComputedStyle(m).opacity === '0') { m.style.opacity = '1'; m.style.transform = 'none'; } }), 4500);
    } catch (e) {
      pod.classList.remove('anime');
      orden.forEach((m) => { m.style.opacity = ''; m.style.transform = ''; });
    }
  };

  /* ------------------------------------------------------------------
     10. TÉCNICAS · comparador deslizante (se barre solo hasta que lo tocas)
     ------------------------------------------------------------------ */
  safe(() => {
    const c = $('#comp'), r = $('#compRango');
    if (!c || !r) return;
    let tocado = false, visible = false, arrastrando = false, raf = 0, t0 = 0;
    const poner = (v) => { v = clamp(v, 0, 100); c.style.setProperty('--x', v.toFixed(2) + '%'); r.value = v; };
    const posicion = (e) => { const b = c.getBoundingClientRect(); return ((e.clientX - b.left) / b.width) * 100; };
    c.addEventListener('pointerdown', (e) => { tocado = true; arrastrando = true; try { c.setPointerCapture(e.pointerId); } catch (_) {} poner(posicion(e)); });
    c.addEventListener('pointermove', (e) => { if (arrastrando) poner(posicion(e)); });
    const soltar = () => { arrastrando = false; };
    c.addEventListener('pointerup', soltar);
    c.addEventListener('pointercancel', soltar);
    r.addEventListener('input', () => { tocado = true; poner(Number(r.value)); });
    function paso(ts) {
      if (tocado || !visible) { raf = 0; return; }
      if (!document.hidden) { if (!t0) t0 = ts; poner(50 + 35 * Math.sin((2 * Math.PI * (ts - t0)) / 6000)); }
      raf = requestAnimationFrame(paso);
    }
    if (!reduce) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf && !tocado) raf = requestAnimationFrame(paso); }, { threshold: 0.2 }).observe(c);
  }, 'comparador');

  /* ------------------------------------------------------------------
     11. BENTO · foco de luz que sigue al cursor + horario vivo
     ------------------------------------------------------------------ */
  safe(() => {
    if (finePointer) {
      $$('.tile').forEach((t) => t.addEventListener('pointermove', (e) => {
        const r = t.getBoundingClientRect();
        t.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
        t.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
      }));
    }
  }, 'bento');

  safe(() => {
    const estado = $('#estado'), h = $('#relH'), m = $('#relM');
    if (!estado) return;
    const calcular = () => {
      let wd = '', hh = 0, mm = 0;
      try {
        const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chihuahua', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
        partes.forEach((p) => {
          if (p.type === 'weekday') wd = p.value;
          if (p.type === 'hour') hh = Number(p.value) % 24;
          if (p.type === 'minute') mm = Number(p.value);
        });
      } catch (_) {
        const d = new Date();
        wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
        hh = d.getHours(); mm = d.getMinutes();
      }
      const mins = hh * 60 + mm;
      const abierto = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(wd) && mins >= 540 && mins < 1080;
      estado.classList.toggle('cerrado', !abierto);
      $('span', estado).textContent = abierto ? 'Abierto ahora' : 'Cerrado ahora';
      if (h) h.style.transform = 'rotate(' + (((hh % 12) + mm / 60) * 30).toFixed(1) + 'deg)';
      if (m) m.style.transform = 'rotate(' + (mm * 6) + 'deg)';
    };
    calcular();
    setInterval(calcular, 60000);
  }, 'horario');

  /* ------------------------------------------------------------------
     12. PREGUNTAS · acordeón animado
     ------------------------------------------------------------------ */
  safe(() => {
    $$('.faq details').forEach((d) => {
      const sum = $('summary', d);
      d.addEventListener('toggle', () => {
        if (d.open) requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('ab')));
        else d.classList.remove('ab');
      });
      sum.addEventListener('click', (e) => {
        if (d.open) {
          e.preventDefault();
          d.classList.remove('ab');
          clearTimeout(d._t);
          d._t = setTimeout(() => { d.open = false; }, reduce ? 0 : 520);
        }
      });
    });
  }, 'faq');

  /* ------------------------------------------------------------------
     13. FORMULARIO → WhatsApp
     ------------------------------------------------------------------ */
  safe(() => {
    const f = $('#formulario');
    if (!f) return;
    const btn = $('#enviar'), ok = $('#formOk'), alt = $('#formAlt');
    if (!WA) { if (btn) btn.hidden = true; if (alt) alt.hidden = false; }

    let cfGlobal = null;
    const confetiGlobal = () => {
      if (cfGlobal || reduce) return cfGlobal;
      const cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:250';
      document.body.appendChild(cv);
      cfGlobal = crearConfeti(cv);
      return cfGlobal;
    };

    const nombre = $('#nombre'), tipo = $('#tipo');
    const marcar = (campo, errEl, msg) => {
      const cont = campo.closest('.campo');
      cont.classList.toggle('invalido', !!msg);
      if (errEl) errEl.textContent = msg || '';
      campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    nombre.addEventListener('input', () => { if (nombre.value.trim()) marcar(nombre, $('#errNombre'), ''); });
    tipo.addEventListener('change', () => { if (tipo.value) marcar(tipo, $('#errTipo'), ''); });

    f.addEventListener('submit', (e) => {
      e.preventDefault();
      let valido = true;
      if (!nombre.value.trim()) { marcar(nombre, $('#errNombre'), '¿Cómo te llamas? Nos gusta saber con quién platicamos.'); valido = false; }
      else marcar(nombre, $('#errNombre'), '');
      if (!tipo.value) { marcar(tipo, $('#errTipo'), 'Cuéntanos qué quieres reconocer para orientarte mejor.'); valido = false; }
      else marcar(tipo, $('#errTipo'), '');
      if (!valido) { (nombre.value.trim() ? tipo : nombre).focus(); return; }
      if (!WA) return;

      const cantidad = $('#cantidad').value.trim();
      const fechaRaw = $('#fecha').value;
      const fecha = fechaRaw ? fechaRaw.split('-').reverse().join('/') : '';
      const detalle = $('#mensaje').value.trim();
      const msg = 'Hola Urreys, soy ' + nombre.value.trim() +
        '. Quiero cotizar: ' + tipo.value +
        '. Cantidad aproximada: ' + (cantidad || 'por definir') +
        '. Fecha del evento: ' + (fecha || 'por definir') +
        '. Detalles: ' + (detalle || 'te los cuento por aquí');
      const a = document.createElement('a');
      a.href = waUrl(msg); a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();

      ok.textContent = '¡Listo! Abrimos WhatsApp para que cierres tu pedido.';
      const cf = confetiGlobal();
      if (cf) { const r = btn.getBoundingClientRect(); cf.estalla(110, r.left + r.width / 2, r.top + r.height / 2); }
    });
  }, 'formulario');

  /* ------------------------------------------------------------------
     14. ARRANQUE DEL MOTOR
     ------------------------------------------------------------------ */
  safe(() => {
    // Revelados: observador + respaldo por geometría
    $$('.reveal, [data-observe]').forEach((el) => pendientes.add(el));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => {
        es.forEach((e) => { if (e.isIntersecting) { revelar(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      pendientes.forEach((el) => io.observe(el));
    }
    root.classList.add('motor');

    if (reduce) {
      pendientes.forEach((el) => { pendientes.delete(el); el.classList.add('in'); });
      scrubs.forEach((s) => {
        const v = s.modo === 'out' ? 0 : 1;
        s.el.style.setProperty('--p', v);
        if (s.hook && hooks[s.hook]) hooks[s.hook](v);
      });
      scrubs.length = 0; // con movimiento reducido el --p queda fijo
      window.addEventListener('scroll', pedir, { passive: true });
      window.addEventListener('resize', pedir);
      actualizar();
      return;
    }

    window.addEventListener('scroll', () => { pedir(); requestAnimationFrame(barrer); }, { passive: true });
    window.addEventListener('resize', () => { pedir(); requestAnimationFrame(barrer); });
    window.addEventListener('load', () => {
      pedir();
      setTimeout(barrer, 2000);
      setTimeout(barrer, 3500);
      setTimeout(barrer, 6000);
    });
    actualizar();
    requestAnimationFrame(barrer);
  }, 'motor');
})();
