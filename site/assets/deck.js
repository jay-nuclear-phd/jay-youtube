// JNP 발표 엔진
// 슬라이드: <section class="slide" data-section="..." data-title="..."> 안에 화면 요소와 <aside class="notes">대본</aside>
// 단계 등장: class="step" 요소가 클릭/→ 할 때마다 하나씩 나타난다. 대본의 <p class="cue" data-step="n">는 n번째 단계 신호.
(function () {
  const W = 1600, H = 900;
  const app = document.querySelector('.app');
  const viewport = document.querySelector('.viewport');
  const deck = document.querySelector('.deck');
  const slides = [...deck.querySelectorAll('.slide')];
  const panel = {
    section: document.querySelector('.panel-section'),
    counter: document.querySelector('.panel-counter'),
    notes: document.querySelector('.panel-notes'),
    next: document.querySelector('.panel-next'),
    progress: document.querySelector('.progress > i'),
  };
  const isPresenter = new URLSearchParams(location.search).has('presenter');
  let peer = isPresenter && window.opener ? window.opener : null;
  let i = 0, step = 0;

  const stepsOf = (s) => [...s.querySelectorAll('.step')];

  function fit() {
    const r = viewport.getBoundingClientRect();
    deck.style.setProperty('--s', Math.min(r.width / W, r.height / H));
  }

  function render(broadcast = true) {
    const s = slides[i];
    slides.forEach((el, k) => el.classList.toggle('active', k === i));
    const st = stepsOf(s);
    st.forEach((el, k) => el.classList.toggle('shown', k < step));
    s.dataset.step = step;

    const notes = s.querySelector('.notes');
    panel.notes.innerHTML = notes ? notes.innerHTML : '<p class="muted">(대본 없음)</p>';
    panel.notes.querySelectorAll('.cue').forEach((c) => {
      c.classList.toggle('done', Number(c.dataset.step) <= step);
    });
    // 다음에 누를 단계 신호가 보이도록 대본을 스크롤
    const pending = panel.notes.querySelector('.cue:not(.done)');
    if (step > 0 && pending) pending.scrollIntoView({ block: 'center' });
    else panel.notes.scrollTop = 0;
    panel.section.textContent = s.dataset.section || '';
    panel.counter.textContent = `${i + 1} / ${slides.length}` + (st.length ? `  ·  단계 ${step}/${st.length}` : '');
    const nx = slides[i + 1];
    panel.next.textContent = nx ? `다음 → ${nx.dataset.title || nx.dataset.section || ''}` : '마지막 슬라이드';
    panel.progress.style.width = `${((i + 1) / slides.length) * 100}%`;
    history.replaceState(null, '', `${location.search}#${i + 1}`);
    if (broadcast && peer && !peer.closed) peer.postMessage({ deck: location.pathname, i, step }, '*');
  }

  function next() {
    if (step < stepsOf(slides[i]).length) step++;
    else if (i < slides.length - 1) { i++; step = 0; }
    render();
  }
  function prev() {
    if (step > 0) step--;
    else if (i > 0) { i--; step = stepsOf(slides[i]).length; }
    render();
  }
  function go(n, full = false) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    step = full ? stepsOf(slides[i]).length : 0;
    render();
  }

  // 발표자 창: 메인 창은 슬라이드만(녹화용), 팝업 창에 대본
  function openPresenter() {
    peer = window.open(`${location.pathname}?presenter#${i + 1}`, 'jnp-presenter', 'width=1280,height=820');
    app.classList.add('no-notes');
    fit();
  }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.deck === location.pathname) {
      if (!peer) peer = e.source;
      i = d.i; step = d.step; render(false);
    }
  });

  // 슬라이드 목록 오버레이
  const toc = document.createElement('div');
  toc.className = 'toc';
  toc.innerHTML = '<div class="toc-box"><h3>슬라이드 목록 <small>(T 또는 Esc로 닫기)</small></h3><ol></ol></div>';
  slides.forEach((s, k) => {
    const li = document.createElement('li');
    li.innerHTML = `<b>${k + 1}</b> <span>${s.dataset.title || ''}</span> <em>${s.dataset.section || ''}</em>`;
    li.onclick = () => { go(k); toc.classList.remove('open'); };
    toc.querySelector('ol').appendChild(li);
  });
  document.body.appendChild(toc);

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      e.preventDefault(); go(i + (e.key === 'ArrowRight' ? 1 : -1)); return;
    }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': e.preventDefault(); prev(); break;
      case 'Home': go(0); break;
      case 'End': go(slides.length - 1, true); break;
      case 'n': case 'N': app.classList.toggle('no-notes'); fit(); break;
      case 'p': case 'P': if (!isPresenter) openPresenter(); break;
      case 'f': case 'F':
        document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); break;
      case 't': case 'T': toc.classList.toggle('open'); break;
      case 'Escape': toc.classList.remove('open'); break;
      case 'h': case 'H': if (!isPresenter) location.href = deck.dataset.home || '../index.html'; break;
    }
  });
  viewport.addEventListener('click', next);
  document.querySelector('[data-act=prev]')?.addEventListener('click', prev);
  document.querySelector('[data-act=next]')?.addEventListener('click', next);
  document.querySelector('[data-act=first]')?.addEventListener('click', () => go(0));
  document.querySelector('[data-act=prevSlide]')?.addEventListener('click', () => go(i - 1));
  document.querySelector('[data-act=nextSlide]')?.addEventListener('click', () => go(i + 1));
  document.querySelector('[data-act=toc]')?.addEventListener('click', () => toc.classList.toggle('open'));
  document.querySelector('[data-act=presenter]')?.addEventListener('click', openPresenter);

  if (isPresenter) {
    app.classList.add('presenter');
    document.title = '[발표자] ' + document.title;
  }
  window.addEventListener('resize', fit);
  const start = parseInt(location.hash.slice(1), 10);
  i = Number.isFinite(start) ? Math.max(0, Math.min(slides.length - 1, start - 1)) : 0;
  fit();
  render(false);
})();

// 차트 등 슬라이드 그림을 그릴 때 쓰는 작은 도구 모음
window.DeckKit = {
  // values → SVG path d. box = {x, y, w, h}, 범위 [min, max]
  linePath(values, box, min, max) {
    const n = values.length - 1;
    return values.map((v, k) => {
      const x = box.x + (box.w * k) / n;
      const y = box.y + box.h - ((v - min) / (max - min)) * box.h;
      return `${k ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  },
  point(values, k, box, min, max) {
    const n = values.length - 1;
    return { x: box.x + (box.w * k) / n, y: box.y + box.h - ((values[k] - min) / (max - min)) * box.h };
  },
  // 시드 고정 랜덤워크 (매번 같은 모양)
  randomWalk(n, seed = 7, start = 100, drift = 0.15, vol = 3) {
    let s = seed, v = start; const out = [v];
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 1; k < n; k++) { v += drift + (rnd() + rnd() + rnd() - 1.5) * vol; out.push(v); }
    return out;
  },
};
