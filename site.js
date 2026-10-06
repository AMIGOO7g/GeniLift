/* GeniLift — сайт: заставка, шахта с параллаксом, двери этажей, появления, заявка, каталог */
(() => {
  if (!/\/$|\.html$/.test(location.pathname)) { location.replace(location.pathname + '/' + location.search + location.hash); return; }
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.hero');

  /* ---------- Появления: разрядка сжимается, блоки раскрываются как двери ---------- */
  const targets = [...document.querySelectorAll('[data-track],[data-doors],[data-fade],[data-reveal]')].filter(el => !el.closest('.fl-body'));
  /* этажи главной: элементы проявляются по очереди, когда лифт погас */
  document.querySelectorAll('.fl-body').forEach(b => b.querySelectorAll('[data-fade],[data-reveal]').forEach((el, i) => el.style.setProperty('--d', Math.min(i * .14, .9) + 's')));
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  const reveal = () => { root.classList.add('ready'); targets.forEach(t => io.observe(t)); };

  /* ---------- Первый экран: дверь открывается, камера въезжает в свет ---------- */
  /* масштаб, при котором проём двери закрывает весь экран — «мы вошли» */
  const fillScale = door => {
    const ow = door.offsetWidth * .6513, oh = door.offsetHeight * .7835;
    const off = Math.abs(door.offsetHeight * .055);
    return Math.max(innerWidth / ow, (innerHeight + off * 2) / oh) * 1.22;   // с запасом: рама уходит за края целиком
  };
  const openHero = (fast) => {
    if (!hero || !hero.querySelector('.door')) return reveal();
    reveal();
  };

  /* ---------- Заставка: стрелка логотипа растёт из точки на шве двери ---------- */
  if (root.classList.contains('intro-on')) {
    let skipped = false, done = false;
    const steps = ['s1', 's2', 's3', 's4', 's5'];
    const end = () => { if (done) return; done = true; root.classList.remove('intro-on', ...steps); openHero(skipped); };
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const add = c => { if (!skipped) root.classList.add(c); };
    (async () => {
      await wait(250); add('s1');
      await wait(450); add('s2');
      await wait(1250); add('s3');
      await wait(2700); if (skipped) return;
      const a = document.getElementById('introLogo'), f = a.getBoundingClientRect();
      const t = document.querySelector('#hdrLogo .logo-svg').getBoundingClientRect();
      a.style.transform = `translate(${t.left - f.left}px, ${t.top - f.top}px) scale(${t.height / f.height})`;
      add('s4');
      await wait(900); add('s5');
      await wait(300); end();
      try { sessionStorage.setItem('gl-intro', '1'); } catch (e) {}
    })();
    document.getElementById('intro').addEventListener('click', () => { skipped = true; end(); });
  } else {
    requestAnimationFrame(reveal);
  }

  /* ---------- Шахта: лифт едет между этажами и останавливается у дверей ---------- */
  const shaft = document.getElementById('shaft');
  /* неизменная высота экрана: адресная строка Safari не сдвигает расчёты */
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  let VH = probe.offsetHeight || innerHeight;
  if (shaft) {
    const wall = shaft.querySelector('.sh-wall');
    const rails = [...shaft.querySelectorAll('.sh-rail')];
    const ropes = [...shaft.querySelectorAll('.sh-ropes')];
    const fg = document.getElementById('fg');
    const stages = [...document.querySelectorAll('[data-stage]')].map(el => ({ el, door: el.querySelector('.door') }));
    const tileH = (el, ratio) => el.offsetWidth * ratio;
    let tW = 0, tRail = 0, tRope = 0;
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const layout = () => {
      VH = probe.offsetHeight || innerHeight;
      tW = tileH(wall, 3);                         // wall.webp 1024×3072
      wall.style.height = innerHeight + tW + 'px';
      tRail = rails[0] ? tileH(rails[0], 3072 / 180) : 1;
      rails.forEach(r => r.style.height = innerHeight + tRail + 'px');
      tRope = ropes[0] ? tileH(ropes[0], 1217 / 190) : 1;
      ropes.forEach(r => r.style.height = innerHeight + tRope + 'px');
      stages.forEach(s => {
        const cs = getComputedStyle(s.el);
        s.stick = parseFloat(getComputedStyle(s.door).top);
        s.dh = s.door.offsetHeight;
        s.pad = parseFloat(cs.paddingTop) || 0;
        s.start = s.el.getBoundingClientRect().top + scrollY + s.pad - s.stick;   // дверь встала по центру
        s.len = s.el.offsetHeight - s.pad - s.dh;                                 // сколько она стоит
        s.E = VH * .95;                                                  // путь открытия и входа
        const wrap = s.el.querySelector('.stage-body .wrap');
        const wb = wrap ? wrap.getBoundingClientRect().bottom + scrollY : s.start + s.len;
        s.dEx = (wb - VH * .35) - s.start;                               // текст ушёл — выходим
        s.X = VH * .9;                                                   // выход: назад, двери закрываются
        s.dEx = Math.min(s.dEx, s.len - s.X - VH * .12);                 // успеть закрыть до отъезда
        const ow = s.door.offsetWidth * .6513, oh = s.dh * .7835, oc = s.stick + s.dh * .555;
        s.S = Math.max(s.el.offsetWidth / ow, 2 * Math.max(oc, VH - oc) / oh) * 1.12;
      });
      /* Передний план: балки и кабели по всему пути лифта (картинки уже размыты) */
      if (fg && !reduce && innerWidth > 820) {
        fg.innerHTML = '';
        const travelMax = document.documentElement.scrollHeight - stages.reduce((n, s) => n + s.len, 0);
        const kinds = ['cab-l', 'beam-r', 'cab-r', 'beam-l'];
        let k = 0;
        for (let y = innerHeight * 1.1; y < travelMax * 1.7 + innerHeight; y += innerHeight * .95) {
          const kind = kinds[k++ % kinds.length], im = new Image();
          im.src = kind.startsWith('beam') ? 'assets/shaft/beam-edge.webp' : 'assets/shaft/cables-blur.webp';
          im.alt = ''; im.className = kind; im.decoding = 'async'; im.style.top = y + 'px';
          fg.appendChild(im);
        }
      }
    };
    let ticking = false, cur = null;
    const frame = () => {
      ticking = false;
      const s = scrollY, vh = innerHeight;
      /* путь лифта = прокрутка минус время стоянок у дверей */
      let travel = s;
      stages.forEach(st => {
        const d = s - st.start;
        travel -= clamp(d, 0, st.len);
        const sm = v => v * v * (3 - 2 * v);
        const open = clamp((d - VH * .05) / (st.E * .3));                      // створки расходятся
        const e = sm(clamp((d - st.E * .25) / (st.E * .75)));      // входим в кабину
        const x = clamp((d - st.dEx) / st.X);                      // выход
        const back = sm(clamp(x / .6));                            // камера отъезжает назад
        const close = sm(clamp((x - .55) / .35));                  // створки закрываются
        const depth = e * (1 - back);
        st.door.style.setProperty('--o', (open * (1 - close)).toFixed(3));
        st.door.style.setProperty('--s', (1 + depth * (st.S - 1)).toFixed(3));
        st.door.style.setProperty('--k', depth.toFixed(3));
        st.door.style.setProperty('--f', '1');
        
      });
      /* сглаживание: слои мягко догоняют прокрутку, без рывков */
      if (cur === null || reduce) cur = travel; else cur += (travel - cur) * .16;
      const px = v => Math.round(v * 2) / 2;
      wall.style.transform = `translate3d(0,${px(-((cur * .35) % tW))}px,0)`;
      rails.forEach(r => r.style.transform = `translate3d(0,${px(-((cur * .8) % tRail))}px,0)`);
      ropes.forEach(r => r.style.transform = `translate3d(0,${px(-((cur * 1) % tRope))}px,0)`);
      if (fg) fg.style.transform = `translate3d(0,${px(-cur * 1.7)}px,0)`;
      if (Math.abs(travel - cur) > .4) { ticking = true; requestAnimationFrame(frame); }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', onScroll, { passive: true });
    let lastW = innerWidth;
    addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; layout(); frame(); });
    addEventListener('load', () => { layout(); frame(); });
    layout(); frame();
  }

  /* ---------- Лифт: один, по центру тёмного экрана; этажи сменяются ---------- */
  const lift = document.getElementById('lift');
  if (lift) {
    const door = document.getElementById('liftDoor');
    const num = document.getElementById('liftNum'), nm = document.getElementById('liftName');
    const cab = document.getElementById('liftCab');
    [2, 3, 4, 5].forEach(n => { const im = new Image(); im.src = 'assets/shaft/cab-' + n + '.webp'; });
    const fls = [...document.querySelectorAll('section.fl')].map(el => ({ el, gap: el.querySelector('.lift-gap'), n: el.dataset.floor, name: el.dataset.short }));
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const sm = v => v * v * (3 - 2 * v);
    const fbgEl = document.getElementById('floorBg');
    let hdrH = 76;
    const layout = () => {
      VH = probe.offsetHeight || innerHeight;
      const hd = document.querySelector('.hdr'); hdrH = hd ? hd.offsetHeight : 76;
      const bar = innerWidth <= 820 ? 56 : 0;
      const dh = Math.round(Math.min(VH - hdrH - bar - 170, 740, innerWidth * 1.28));
      lift.style.setProperty('--dh', dh + 'px');
      fls.forEach((f, i) => {
        const top = f.gap.getBoundingClientRect().top + scrollY, h = f.gap.offsetHeight;
        f.a = i === 0 ? 0 : top - VH * .12;         // предыдущий этаж ушёл целиком
        f.b = top + h - hdrH;                         // этаж уже стоит под шапкой — лифт погас
      });
    };
    let ticking = false, shown = '';
    const frame = () => {
      ticking = false;
      const s = scrollY;
      let vis = 0, open = 0, bp = 0, bo = 0, hold = 0, f0 = null, prev = null;
      fls.forEach((f, i) => {
        if (s >= f.b - 4) f.el.querySelector('.fl-body').classList.add('go');
        if (s < f.a || s > f.b) return;
        const t = clamp((s - f.a) / (f.b - f.a));
        f0 = f; prev = fls[i - 1];
        if ((i === 0 || t > .55) && fbgEl) fbgEl.style.setProperty('--fbg', f.el.dataset.bg);   // двери открылись — свет этажа
        if (i === 0) {                                   // первый этаж: двери закрыты → открываются → уходим в раздел
          vis = 1 - sm(clamp((t - .82) / .18));
          open = sm(clamp((t - .1) / .45));
          prev = null;
        } else {                                         // закрываем прошлый этаж → едем → открываем новый
          vis = sm(clamp(t / .12)) * (1 - sm(clamp((t - .84) / .16)));
          const close = sm(clamp((t - .12) / .2));
          const reopen = sm(clamp((t - .54) / .26));
          open = t < .5 ? 1 - close : reopen;
          const u = clamp((t - .3) / .18);               // лифт едет: свет этажа проходит по щели
          bp = sm(u);                                     // разгон и торможение
          bo = Math.min(1, u / .12, (1 - u) / .12);
          hold = clamp((t - .46) / .04) * (1 - clamp((t - .56) / .06));  // встал — шов ровно светится
          if (t >= .32) prev = null;                      // двери закрыты — номер уже новый
        }
      });
      const show = prev || f0;
      if (show && show.n !== shown) { shown = show.n; num.textContent = '0' + show.n; nm.textContent = show.el.dataset.name; if (cab) cab.src = 'assets/shaft/cab-' + show.n + '.webp'; window.__glFloor = +show.n; }
      const set = (el, k, v) => { if (el['_' + k] !== v) { el['_' + k] = v; el.style.setProperty(k, v); } };
      set(lift, '--v', vis.toFixed(2));
      const vv = vis < .01 ? 'hidden' : 'visible'; if (lift._vis !== vv) { lift._vis = vv; lift.style.visibility = vv; }

      set(lift, '--hint', (1 - clamp(s / (VH * .06))).toFixed(2));
      set(door, '--o', open.toFixed(3));
      set(door, '--bp', bp.toFixed(3));
      set(door, '--bo', Math.max(0, bo).toFixed(2));
      set(door, '--wo', Math.max(0, bo).toFixed(2));
      set(door, '--hold', hold.toFixed(2));
    };
    /* цвет этажа: фон перетекает в цвет раздела, который сейчас на экране */
    const fbg = document.getElementById('floorBg');
    if (fbg) {
      const bio = new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting) fbg.style.setProperty('--fbg', en.target.closest('.fl').dataset.bg);
      }), { rootMargin: '-40% 0px -40% 0px' });
      fls.forEach(f => bio.observe(f.el.querySelector('.fl-body')));
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', onScroll, { passive: true });
    let lw = innerWidth;
    addEventListener('resize', () => { if (innerWidth === lw) return; lw = innerWidth; layout(); frame(); });
    addEventListener('load', () => { layout(); frame(); });
    layout(); frame();
  }

  /* ---------- Табло этажа в шапке: цифра и стрелка направления ---------- */
  const reel = document.getElementById('hfReel'), hfName = document.getElementById('hfName');
  const arrow = document.getElementById('hfArrow');
  let floorNow = reel ? Math.round(-parseFloat((reel.style.transform.match(/-?[\d.]+/) || [0])[0]) / 28) + 1 : 1;
  if (arrow) {
    let lastY = scrollY, idle;
    addEventListener('scroll', () => {
      const y = scrollY; if (Math.abs(y - lastY) < 4) return;
      arrow.classList.add('go'); arrow.classList.toggle('down', y > lastY); lastY = y;
      clearTimeout(idle); idle = setTimeout(() => arrow.classList.remove('go'), 700);
    }, { passive: true });
  }
  const floors = document.querySelectorAll('[data-floor]');
  if (reel && floors.length) {
    const fio = new IntersectionObserver(es => es.forEach(en => {
      if (!en.isIntersecting) return;
      floorNow = +en.target.dataset.floor;
      reel.style.transform = `translateY(${-(floorNow - 1) * 28}px)`;
      hfName.textContent = en.target.dataset.name;
    }), { rootMargin: '-45% 0px -50% 0px' });
    floors.forEach(f => fio.observe(f));
  }

  /* ---------- Переход между страницами: двери смыкаются и расходятся ---------- */
  const pd = document.getElementById('pagedoors');
  if (root.classList.contains('nav-in')) {
    pd.classList.add('shut');
    /* открываем двери, когда страница действительно готова к показу (шрифты), — иначе Safari «съедает» анимацию */
    const openDoors = () => requestAnimationFrame(() => requestAnimationFrame(() => { root.classList.remove('nav-in'); pd.classList.remove('shut'); }));
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(r => setTimeout(r, 700))]).then(() => setTimeout(openDoors, 120));
    try { sessionStorage.removeItem('gl-nav'); } catch (e) {}
  }
  const go = href => {
    if (reduce) { location.href = href; return; }
    try { sessionStorage.setItem('gl-nav', '1'); } catch (e) {}
    pd.classList.add('shut');
    setTimeout(() => { location.href = href; }, 430);
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const href = a.getAttribute('href');
    if (/^(tel:|mailto:|https?:|#)/.test(href)) return;
    const url = new URL(a.href, location.href);
    if (url.pathname === location.pathname && url.hash) return;   // якорь на этой же странице
    e.preventDefault();
    const key = a.closest('.lm-keys') || a.closest('.plan');
    if (key) { a.classList.add('lit'); setTimeout(() => go(a.href), 260); } else go(a.href);
  });
  addEventListener('pageshow', e => { if (e.persisted) pd.classList.remove('shut'); });

  /* ---------- Меню: лифтовая панель ---------- */
  const lm = document.getElementById('liftmenu');
  const lmFloor = document.getElementById('lmFloor');
  const menuBtn = document.querySelector('[data-menu-open]');
  const here = location.pathname.replace(/index\.html$/, '');
  lm.querySelectorAll('.pl-f').forEach(a => {
    const p = new URL(a.href, location.href).pathname.replace(/index\.html$/, '');
    if (p === here) a.classList.add('here');
  });
  lm.querySelectorAll('.lm-keys a').forEach(a => {
    const p = new URL(a.href, location.href).pathname.replace(/index\.html$/, '');
    if (p === here) a.setAttribute('aria-current', 'page');
  });
  const openMenu = () => {
    const fl = window.__glFloor || floorNow; lmFloor.textContent = String(fl).padStart(2, '0');
    if (window.__glFloor) { const ps = [...lm.querySelectorAll('.pl-f')].reverse(); ps.forEach((a, i) => a.classList.toggle('here', i + 1 === fl)); } lm.classList.add('open'); lm.setAttribute('aria-hidden', 'false'); menuBtn.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; setTimeout(() => lm.querySelector('.lm-keys a').focus(), 60); };
  const closeMenu = () => { lm.classList.remove('open'); lm.setAttribute('aria-hidden', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; menuBtn.focus(); };
  menuBtn.addEventListener('click', openMenu);
  lm.addEventListener('click', e => { if (e.target === lm || e.target.closest('[data-menu-close]')) closeMenu(); if (e.target.closest('[data-cart-open]')) closeMenu(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && lm.classList.contains('open')) closeMenu(); });

  /* ---------- Формы «вопрос или фото» ---------- */
  document.querySelectorAll('[data-ask]').forEach(form => {
    const span = form.querySelector('.file span');
    form.photo.addEventListener('change', () => { span.textContent = form.photo.files[0] ? form.photo.files[0].name : 'Прикрепить фото шильдика'; });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const st = form.querySelector('.ask-status');
      if (!form.phone.value.trim()) { st.textContent = 'Укажите телефон — по нему перезвоним.'; form.phone.focus(); return; }
      if (!form.agree.checked) { st.textContent = 'Отметьте согласие на обработку данных.'; return; }
      st.textContent = 'Демо: отправка заработает после подключения сервера.';
    });
  });
})();
/* ---------- Заявка, каталог, вкладки ---------- */
(() => {
  const KEY = 'gl-cart';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = c => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} };
  let cart = load();
  const drawer = document.getElementById('drawer');
  const lines = document.getElementById('cartLines');
  const toast = document.getElementById('toast');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const render = () => {
    const total = cart.reduce((n, i) => n + i.q, 0);
    document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = total);
    lines.innerHTML = cart.length
      ? cart.map((i, k) => `<div class="line"><div><b>${esc(i.b)} ${esc(i.a)}</b><span>${esc(i.n)}</span></div>
          <div class="qty"><button type="button" data-q="${k}" data-d="-1" aria-label="Меньше">−</button><output>${i.q}</output><button type="button" data-q="${k}" data-d="1" aria-label="Больше">+</button></div>
          <button class="rm" type="button" data-rm="${k}" aria-label="Убрать">×</button></div>`).join('')
      : '<p class="drawer-empty">Заявка пуста. Добавьте детали из лавки или просто опишите задачу и пришлите фото — подберём сами.</p>';
    document.querySelectorAll('[data-add]').forEach(b => {
      const d = JSON.parse(b.dataset.add), inCart = cart.some(i => i.s === d.s);
      b.classList.toggle('in', inCart);
      const label = b.querySelector('span');
      if (label) label.textContent = inCart ? 'В заявке' : 'В заявку';
    });
  };
  const say = t => { toast.textContent = t; toast.classList.add('show'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('show'), 2200); };
  const bump = () => document.querySelectorAll('.hdr-cart').forEach(b => { b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 300); });

  let last;
  const open = photo => {
    last = document.activeElement;
    drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => (photo ? drawer.querySelector('.file input') : drawer.querySelector('.drawer-head .ico')).focus(), 50);
  };
  const close = () => {
    drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; if (last) last.focus();
  };
  document.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) {
      const d = JSON.parse(add.dataset.add), f = cart.find(i => i.s === d.s);
      if (f) f.q++; else cart.push({ ...d, q: 1 });
      save(cart); render(); bump(); say(`${d.b} ${d.a} — в заявке`);
      return;
    }
    const q = e.target.closest('[data-q]');
    if (q) { const i = cart[+q.dataset.q]; i.q = Math.max(1, i.q + +q.dataset.d); save(cart); render(); return; }
    const rm = e.target.closest('[data-rm]');
    if (rm) { cart.splice(+rm.dataset.rm, 1); save(cart); render(); return; }
    const op = e.target.closest('[data-cart-open]');
    if (op) { open(op.hasAttribute('data-photo')); return; }
    if (e.target.closest('[data-cart-close]')) close();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) close(); });

  const form = document.getElementById('order');
  const fileSpan = form.querySelector('.file span');
  form.photo.addEventListener('change', () => { fileSpan.textContent = form.photo.files[0] ? form.photo.files[0].name : 'Прикрепить фото детали или шильдика'; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const st = form.querySelector('.order-status');
    if (!form.phone.value.trim()) { st.textContent = 'Укажите телефон — по нему перезвоним.'; form.phone.focus(); return; }
    if (!form.agree.checked) { st.textContent = 'Отметьте согласие на обработку данных.'; return; }
    if (!cart.length && !form.photo.files[0] && !form.msg.value.trim()) { st.textContent = 'Добавьте деталь, фото или опишите задачу.'; return; }
    st.textContent = 'Демо: отправка заработает после подключения сервера.';
  });
  render();

  /* ---------- Страница корзины и оформление ---------- */
  const cpLines = document.getElementById('cpLines');
  if (cpLines) {
    const cpEmpty = document.getElementById('cpEmpty'), cpSum = document.getElementById('cpSum');
    const plural = n => n % 10 === 1 && n % 100 !== 11 ? 'позиция' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'позиции' : 'позиций';
    const draw = () => {
      cpLines.innerHTML = cart.map((i, k) => `<div class="cp-line"><a href="../zapchasti/${esc(i.s)}/"><b>${esc(i.a)}</b><span>${esc(i.b)} · ${esc(i.n)}</span></a>
        <div class="qty"><button type="button" data-q="${k}" data-d="-1" aria-label="Меньше">−</button><output>${i.q}</output><button type="button" data-q="${k}" data-d="1" aria-label="Больше">+</button></div>
        <em>по запросу</em><button class="rm" type="button" data-rm="${k}" aria-label="Убрать">×</button></div>`).join('');
      const total = cart.reduce((n, i) => n + i.q, 0);
      cpEmpty.hidden = cart.length > 0;
      cpSum.textContent = cart.length ? `${cart.length} ${plural(cart.length)}, ${total} шт. Цена и срок — после проверки совместимости.` : '';
    };
    draw();
    document.addEventListener('click', e => { if (e.target.closest('[data-q],[data-rm]')) setTimeout(draw, 0); });
    const f = document.getElementById('checkout');
    const comp = f.querySelector('.cp-company');
    f.querySelectorAll('input[name=who]').forEach(r => r.addEventListener('change', () => { comp.hidden = f.who.value !== 'company'; }));
    const addr = f.querySelector('.cp-addr');
    f.querySelectorAll('input[name=ship]').forEach(r => r.addEventListener('change', () => { addr.hidden = f.ship.value === 'self'; }));
    const fs = f.querySelector('.cp-file span');
    f.photo.addEventListener('change', () => { fs.textContent = f.photo.files[0] ? f.photo.files[0].name : 'Прикрепить фото шильдика'; });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const st = f.querySelector('.cp-status');
      if (!f.phone.value.trim()) { st.textContent = 'Укажите телефон — по нему перезвоним.'; f.phone.focus(); return; }
      if (!cart.length && !f.photo.files[0] && !f.msg.value.trim()) { st.textContent = 'Добавьте деталь из лавки, фото или опишите задачу.'; return; }
      if (!f.agree.checked) { st.textContent = 'Отметьте согласие на обработку данных.'; return; }
      const num = 'GL-' + String(Date.now()).slice(-5);
      const done = document.getElementById('cpDone');
      done.querySelector('.cp-num').textContent = `Заказ ${num} принят (демо: отправка заработает после подключения сервера)`;
      f.hidden = true; done.hidden = false;
      cart = []; save(cart); render(); draw();
      done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* Каталог: поиск, марки, разделы */
  const grid = document.getElementById('grid');
  if (grid) {
    const cards = [...grid.querySelectorAll('.card')];
    const norm = s => s.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '');
    cards.forEach(c => c._n = norm(c.dataset.q));
    const q = document.getElementById('q'), found = document.getElementById('found'), empty = document.getElementById('empty'), reset = document.getElementById('reset');
    const p0 = new URLSearchParams(location.search);
    const st = { q: p0.get('q') || '', brand: (p0.get('brand') || '').toLowerCase(), cat: p0.get('cat') || '' };
    q.value = st.q;
    const plural = n => n % 10 === 1 && n % 100 !== 11 ? 'позиция' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'позиции' : 'позиций';
    const apply = () => {
      const nq = norm(st.q); let n = 0;
      cards.forEach(c => {
        const ok = (!nq || c._n.includes(nq)) && (!st.brand || c.dataset.brand === st.brand) && (!st.cat || c.dataset.cat === st.cat);
        c.hidden = !ok; if (ok) n++;
      });
      found.textContent = `${n} ${plural(n)}`;
      empty.hidden = n > 0;
      reset.hidden = !(st.q || st.brand || st.cat);
      document.querySelectorAll('.chips button').forEach(b => b.setAttribute('aria-pressed', b.dataset.brand === st.brand));
      document.querySelectorAll('.cats button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cat === st.cat));
      const p = new URLSearchParams(); if (st.q) p.set('q', st.q); if (st.brand) p.set('brand', st.brand); if (st.cat) p.set('cat', st.cat);
      history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
    };
    q.addEventListener('input', () => { st.q = q.value; apply(); });
    document.getElementById('searchForm').addEventListener('submit', e => { e.preventDefault(); st.q = q.value; apply(); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    document.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => { st.brand = st.brand === b.dataset.brand ? '' : b.dataset.brand; apply(); }));
    document.querySelectorAll('.cats button').forEach(b => b.addEventListener('click', () => { st.cat = st.cat === b.dataset.cat ? '' : b.dataset.cat; apply(); }));
    reset.addEventListener('click', () => { st.q = st.brand = st.cat = ''; q.value = ''; apply(); });
    if (location.hash === '#q') q.focus();
    addEventListener('hashchange', () => { if (location.hash === '#q') { q.focus(); q.scrollIntoView({ block: 'center' }); } });
    apply();
  }

  /* Вкладки карточки */
  const tabs = [...document.querySelectorAll('[role=tab]')];
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
  }));
})();
