/* ============================================================
   1. 히어로 파티클 워드마크 — OPPORTUNITY
   ============================================================ */
(function () {
  var cv = document.getElementById('wm');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var W = 0, H = 0, DPR = 1;
  var px, py, vx, vy, ax, ay, bx, by, st, N = 0;
  var WHITE = '#FFFFFF', RED = '#EA1525';
  var mouse = { x: -9999, y: -9999 };
  var running = false, visible = true;

  /* 전환을 이끄는 S 심볼 */
  var SYM = new Image();
  SYM.src = 'assets/img/hero-symbol.webp';

  /* 심볼이 지나가며 글자가 바뀐다 */
  var SWEEP = 1750, HOLD_A = 2300, HOLD_B = 4200;
  var state = 0;              /* 0 = TURN VIDEO INTO, 1 = OPPORTUNITY */
  var sweeping = false, toState = 1, sweepStart = 0, sx = -1, nextAt = 0;
  var bandTop = 0, bandH = 0;

  function sample(text, step) {
    var off = document.createElement('canvas');
    off.width = W; off.height = H;
    var oc = off.getContext('2d');
    oc.font = '800 100px "PP Mori", Pretendard, sans-serif';
    var ls = false;
    try { oc.letterSpacing = '-0.035em'; ls = oc.letterSpacing !== '0px'; } catch (e) {}
    var fill = ls ? 0.995 : 0.965;
    var size = (W * fill) / (oc.measureText(text).width || 700) * 100;
    var maxH = H * 0.94;
    if (size * 0.78 > maxH) size = maxH / 0.78;
    oc.font = '800 ' + size + 'px "PP Mori", Pretendard, sans-serif';
    if (ls) { try { oc.letterSpacing = '-0.035em'; } catch (e) {} }
    oc.textAlign = 'center';
    oc.textBaseline = 'middle';
    oc.fillStyle = '#fff';
    oc.fillText(text, W / 2, H / 2);
    var data = oc.getImageData(0, 0, W, H).data;
    var pts = [], top = H, bot = 0;
    for (var y = 0; y < H; y += step) {
      for (var x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 140) {
          pts.push([x + (Math.random() - 0.5) * 1.4, y + (Math.random() - 0.5) * 1.4]);
          if (y < top) top = y;
          if (y > bot) bot = y;
        }
      }
    }
    pts.sort(function (p, q) { return p[0] - q[0]; });
    return { pts: pts, top: top, bot: bot, size: size };
  }

  function build() {
    var rect = cv.getBoundingClientRect();
    W = Math.max(320, Math.round(rect.width));
    H = Math.max(64, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var step = W < 560 ? 3 : 4;
    var A = sample('TURN VIDEO INTO', step);
    var B = sample('OPPORTUNITY', step);
    bandTop = Math.min(A.top, B.top);
    bandH = Math.max(1, Math.max(A.bot, B.bot) - bandTop);

    N = Math.max(A.pts.length, B.pts.length);
    if (!N) return;
    ax = new Float32Array(N); ay = new Float32Array(N);
    bx = new Float32Array(N); by = new Float32Array(N);
    px = new Float32Array(N); py = new Float32Array(N);
    vx = new Float32Array(N); vy = new Float32Array(N);
    st = new Uint8Array(N);

    /* x 순으로 비례 매칭 — 같은 자리의 입자가 서로 바뀐다 */
    for (var k = 0; k < N; k++) {
      var pa = A.pts[(k * A.pts.length / N) | 0];
      var pb = B.pts[(k * B.pts.length / N) | 0];
      ax[k] = pa[0]; ay[k] = pa[1];
      bx[k] = pb[0]; by[k] = pb[1];
      st[k] = reduce ? 1 : 0;
      if (reduce) { px[k] = bx[k]; py[k] = by[k]; }
      else {
        var a = Math.random() * Math.PI * 2;
        var d = A.size * (0.04 + Math.random() * 0.14);
        px[k] = ax[k] + Math.cos(a) * d;
        py[k] = ay[k] + Math.sin(a) * d * 0.7;
      }
      vx[k] = 0; vy[k] = 0;
    }
    state = reduce ? 1 : 0;
    sweeping = false; sx = -1;
    nextAt = performance.now() + HOLD_A;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!N) return;

    /* 심볼이 지나간 잔광 */
    if (sweeping) {
      var y0 = bandTop - 16, hh = bandH + 32;
      var g = ctx.createLinearGradient(sx - 220, 0, sx, 0);
      g.addColorStop(0, 'rgba(234,21,37,0)');
      g.addColorStop(0.62, 'rgba(234,21,37,0.10)');
      g.addColorStop(1, 'rgba(234,21,37,0.26)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 220, y0, 220, hh);
    }

    var i;
    ctx.fillStyle = WHITE;
    for (i = 0; i < N; i++) if (!st[i]) ctx.fillRect(px[i], py[i], 2, 2);
    ctx.fillStyle = RED;
    for (i = 0; i < N; i++) if (st[i]) ctx.fillRect(px[i], py[i], 2, 2);

    /* 전환을 이끄는 S 심볼 — 글자 위를 지나간다 */
    if (sweeping && SYM.complete && SYM.naturalWidth) {
      var sh = Math.min(bandH * 1.34, H * 0.94), sw = sh * SYM.naturalWidth / SYM.naturalHeight;
      ctx.drawImage(SYM, sx - sw / 2, H / 2 - sh / 2, sw, sh);
    }
  }

  var acc = 0, prevT = 0, hcTick = 0, hcBad = 0;
  function step() {
    if (!visible) { running = false; return; }
    var now = performance.now();
    if (!prevT) prevT = now - 16.7;
    acc = Math.min(acc + Math.min(120, now - prevT), 66.8); prevT = now;
    var sub = 0, i;

    if (!reduce && N) {
      if (!sweeping && now >= nextAt) {
        sweeping = true; sweepStart = now; toState = state ? 0 : 1; sx = -130;
      }
      if (sweeping) {
        var p = (now - sweepStart) / SWEEP;
        if (p > 1) p = 1;
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        sx = -130 + e * (W + 270);
        /* 바가 지나간 입자부터 글자가 바뀐다 */
        for (i = 0; i < N; i++) {
          if (st[i] !== toState && px[i] <= sx) {
            st[i] = toState;
            vx[i] += 0.7 + Math.random() * 0.7;
            vy[i] += (Math.random() - 0.5) * 1.8;
          }
        }
        if (p >= 1) {
          for (i = 0; i < N; i++) st[i] = toState;
          state = toState; sweeping = false; sx = -1;
          nextAt = now + (state ? HOLD_B : HOLD_A);
        }
      }
    }

    while (acc >= 16.7 && sub < 4) {
      acc -= 16.7; sub++;
      var k = sweeping ? 0.15 : 0.06;
      var damp = sweeping ? 0.80 : 0.86;
      for (i = 0; i < N; i++) {
        var gx = st[i] ? bx[i] : ax[i];
        var gy = st[i] ? by[i] : ay[i];
        var fx = (gx - px[i]) * k;
        var fy = (gy - py[i]) * k;
        var dx = px[i] - mouse.x, dy = py[i] - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 8100 && d2 > 0.01) {
          var f = (8100 - d2) / 8100 * 0.9;
          var d = Math.sqrt(d2);
          fx += (dx / d) * f * 2.6;
          fy += (dy / d) * f * 2.6;
        }
        var nvx = (vx[i] + fx) * damp, nvy = (vy[i] + fy) * damp;
        var sp = nvx * nvx + nvy * nvy;
        if (sp > 144) { var sc = 12 / Math.sqrt(sp); nvx *= sc; nvy *= sc; }
        vx[i] = nvx; vy[i] = nvy;
        px[i] += vx[i]; py[i] += vy[i];
      }
    }

    /* 자가 복구 */
    if (!sweeping && ++hcTick % 30 === 0 && N) {
      if (mouse.x < -100) {
        var sum = 0, cnt = 0, stp = Math.max(1, (N / 160) | 0);
        for (var s = 0; s < N; s += stp) {
          var tx0 = st[s] ? bx[s] : ax[s], ty0 = st[s] ? by[s] : ay[s];
          var ddx = px[s] - tx0, ddy = py[s] - ty0;
          sum += ddx * ddx + ddy * ddy; cnt++;
        }
        if (Math.sqrt(sum / (cnt || 1)) > 14) { if (++hcBad >= 3) { snap(); hcBad = 0; } }
        else hcBad = 0;
      } else hcBad = 0;
    }

    draw();
    requestAnimationFrame(step);
  }

  function snap() {
    for (var i = 0; i < N; i++) {
      px[i] = st[i] ? bx[i] : ax[i];
      py[i] = st[i] ? by[i] : ay[i];
      vx[i] = 0; vy[i] = 0;
    }
  }

  function start() {
    if (reduce) { draw(); return; }
    if (!running) { running = true; requestAnimationFrame(step); }
  }

  function init() { build(); draw(); start(); }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init).catch(init);
  } else { init(); }

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { build(); draw(); start(); }, 220);
  });

  cv.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    start();
  });
  cv.addEventListener('pointerleave', function () { mouse.x = -9999; mouse.y = -9999; });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { prevT = 0; acc = 0; running = false; start(); }
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0 }).observe(cv);
  }

  /* 루프가 멎으면 글자를 제자리로 */
  setInterval(function () {
    if (document.hidden || reduce || !N) return;
    if (performance.now() - prevT > 2000) {
      sweeping = false; sx = -1;
      for (var i = 0; i < N; i++) st[i] = state;
      snap();
      nextAt = performance.now() + (state ? HOLD_B : HOLD_A);
      prevT = 0; acc = 0; running = false;
      draw(); start();
    }
  }, 2500);
})();

/* ============================================================
   2. FAQ 탭
   ============================================================ */
(function () {
  var tabs = document.querySelectorAll('.faq-tab');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
    });
  });
})();

/* ============================================================
   3. 푸터에 닿으면 플로팅 CTA 숨김
   ============================================================ */
(function () {
  var cta = document.getElementById('floatCta');
  var foot = document.getElementById('footer');
  var attend = document.getElementById('attend');
  if (!cta || !foot || !('IntersectionObserver' in window)) return;
  var active = [];
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var i = active.indexOf(e.target);
      if (e.isIntersecting) { if (i < 0) active.push(e.target); }
      else if (i >= 0) { active.splice(i, 1); }
    });
    cta.classList.toggle('is-hidden', active.length > 0);
  }, { threshold: 0.2 });
  var hero = document.querySelector('.hero');
  io.observe(foot);
  io.observe(attend);
  if (hero) io.observe(hero);
})();

/* 언어 선택 드롭다운 */
(function () {
  var box = document.querySelector('[data-lang]');
  if (!box) return;
  var btn = box.querySelector('.lang-btn');
  var menu = box.querySelector('.lang-menu');
  function close() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();

/* 히어로 락업 폭을 헤드라인 글자 폭에 맞춘다 */
(function () {
  var h1 = document.querySelector('.hero h1');
  var img = document.querySelector('.hero-lockup .hl-mark');
  if (!h1 || !img || !document.createRange) return;
  var meta = document.querySelector('.hero-meta');
  function textW(el) {
    var r = document.createRange();
    r.selectNodeContents(el);
    return r.getBoundingClientRect().width;
  }
  function fit() {
    var w = textW(h1);
    if (w <= 40) return;
    var target = Math.round(Math.min(w * 1.46, window.innerWidth * 0.93));
    img.style.width = target + 'px';
    /* 행사 정보 줄을 락업 가로폭에 맞춘다 (모바일은 두 줄 각각을 폭에 맞춤) */
    if (meta) {
      var narrow = window.innerWidth <= 700;
      var spans = meta.querySelectorAll('span');
      meta.style.fontSize = '';
      for (var i = 0; i < 3; i++) {
        var fs = parseFloat(getComputedStyle(meta).fontSize) || 15;
        var wide;
        if (narrow && spans.length === 4) {
          var r1 = document.createRange(); r1.setStartBefore(spans[0]); r1.setEndAfter(spans[1]);
          var r2 = document.createRange(); r2.setStartBefore(spans[2]); r2.setEndAfter(spans[3]);
          wide = Math.max(r1.getBoundingClientRect().width, r2.getBoundingClientRect().width);
        } else {
          wide = textW(meta);
        }
        if (wide < 30) break;
        var next = fs * (target * (narrow ? 0.86 : 0.68)) / wide;
        next = Math.max(11, Math.min(narrow ? 26 : 22, next));
        meta.style.fontSize = next.toFixed(2) + 'px';
      }
    }
  }
  window.__fitHero = fit;
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit).catch(fit);
  var t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(fit, 180); });
})();

/* ============================================================
   4. 다국어 (KO / EN / JA)
   ============================================================ */
window.I18N = {
en: {
"라이브 기술이 만드는 <span>확장과 기회</span>": "Video commerce that drives <span>growth and opportunity</span>",
"라이브커머스를 이끄는 리더들이<br /><em>한 자리에</em>": "The leaders of live commerce,<br /><em>together in one room</em>",
"Summit을 통해 무엇을 얻어갈 수 있나요?": "What will you take away from the Summit?",
"Summit에서 만나실 수 있습니다.": "Only at the Summit.",
"10월 2일 단 하루,<br /><em>비디오커머스의 미래</em>를 확인하는 시간": "One day only — October 2,<br />where <em>the future of video commerce</em> comes into view",
"초청받으신 분들을 위한 자리입니다": "An invitation-only gathering",
"찾아오시는 길": "Getting there",
"자주 묻는 질문": "Frequently asked questions",
"무신사의 성장과 라이브커머스의 역할": "MUSINSA's growth, and the role live commerce played",
"리빙 라이브의 진화, 구경을 넘어 구매로": "Living goes further — from browsing to buying",
"육아 카테고리 라이브커머스 운영 노하우": "Running live commerce in the baby category",
"팬이 고객으로 바꾸는 순간, 인플루언서 라이브의 운영 노하우": "Turning fans into customers — how influencer live is run",
"일본 Beauty Live Commerce의 특징과 인사이트": "Inside Japan's beauty live commerce — what makes it different",
"K뷰티를 세계로, 라이브커머스 전략": "Taking K-beauty global with live commerce",
"AI로 진화하는 라이브커머스 기술과 고객 가치": "How AI is reshaping live commerce technology and customer value",
"숫자로 본 라이브, 지난 1년간의 성과": "Live by the numbers — the past year in results",
"데모부스": "Demo booth",
"네트워킹 런치": "Networking lunch",
"기념품": "Summit gift",
"럭키드로우": "Lucky draw",
"주소": "Address",
"체크인": "Check-in",
"1F 지상 이동 시": "Via ground level (1F)",
"B1F 쇼핑몰 방향 이동 시": "Via the mall (B1F)",
"<span>2026. 10. 2 (금)</span><i>·</i> <span>롯데월드타워 SKY31</span><i>·</i> <span>주최·주관 : SHOPLIVE</span><i>·</i> <span>초대 고객 대상</span>": "<span>Fri, October 2, 2026</span><i>·</i> <span>Lotte World Tower SKY31</span><i>·</i> <span>Hosted by SHOPLIVE</span><i>·</i> <span>By invitation only</span>",
"성과를 만들고 있는 플랫폼과 브랜드의 <b>실행법</b>": "The <b>playbook</b> for platforms and brands that are already delivering results",
"카테고리별 <b>라이브·숏폼 성공 전략</b>": "<b>Live &amp; short-form strategy</b>, by category",
"한국에서 일본까지, <b>확장과 성장의 기회</b>": "From Korea and Japan to the world, <b>your next growth opportunity</b>",
"라이브커머스는 각 산업에서 어떻게 진화하고 있을까요?": "How is live commerce evolving in each industry?",
"Video Commerce Summit 2026은 국내 Video Commerce 시장을 선도해온 리더들과 일본의 주요 뷰티·커머스 기업이 한자리에 모이는 자리입니다.": "Video Commerce Summit 2026 brings together the leaders who have shaped Korea's video commerce market and the major beauty and commerce companies of Japan.",
"각자의 시장에서 실제 성과로 증명해온 성공 사례와 인사이트를 공유하고, 이를 바탕으로 한국의 라이브커머스 역량이 아시아 시장으로 확장되는 새로운 교두보를 함께 만들어가고자 합니다.": "Each speaker shares the cases and insights they've proven with real results in their own market — and together we'll build the gateway that carries Korea's live commerce expertise across Asia.",
"단순히 성공 사례를 ‘듣는’ 자리가 아닙니다.<br />2026년 하반기와 2027년, 무엇을 실행하고 어떻게 성장할 것인지를 함께 고민하고, 새로운 비즈니스 기회와 전략을 구체화하는 자리입니다.": "This is not a day for simply listening to success stories.<br />It is a working session on what to execute through the second half of 2026 and into 2027 — and on turning new business opportunities into a concrete strategy.",
"라이브커머스 시장이 어디를 향해 나아가고 있는지, Shoplive Video Commerce Summit 에서 가장 먼저 확인하실 수 있습니다.": "See where the live commerce market is heading — first, at the Shoplive Video Commerce Summit.",
"<b>김기영</b> 샵라이브 CEO(대표)": "<b>Kiyoung Kim</b> CEO, Shoplive",
"<b>이규원</b> 샵라이브 최고기술책임자(CTO)": "<b>Kyuwon Lee</b> CTO, Shoplive",
"<b>김성진</b> 샵라이브 비즈니스총괄책임자(CBO)": "<b>Sungjin Kim</b> CBO, Shoplive",
"카테고리를 이끄는 브랜드들이 어디서 기회를 찾았고, 그 기회를 어떻게 매출로 연결했는지 직접 확인하세요. 실전 사례를 통해 라이브커머스가 브랜드를 다음 단계로 이끄는 방법을 배울 수 있습니다.": "See first-hand where category-leading brands found their opportunity and how they turned it into revenue. Real cases show how live commerce takes a brand to its next stage.",
"라이브커머스를 이제 막 시작하셨든 이미 운영 중이든, 지금 단계에 필요한 실전 전략과 카테고리별 방법론을 만나보실 수 있습니다.": "Whether you are just starting out with live commerce or already running it, you will find the hands-on strategy and category playbook that fits your current stage.",
"국내 카테고리 리더는 물론 일본 뷰티·커머스 기업과 한자리에서 교류하며, 한국의 라이브커머스 역량을 글로벌로 넓힐 접점을 만나보세요.": "Meet Korea's category leaders alongside Japanese beauty and commerce companies, and find the contacts that carry your live commerce capability beyond Korea.",
"라이브커머스가 우리 브랜드에 맞을지 확신이 없으신가요? 실제 매출로 이어진 사례와 도입부터 정착까지의 방법론으로, 지금 결정에 필요한 답을 이 자리에서 얻어가실 수 있습니다.": "Not sure live commerce is right for your brand? Cases that led to real revenue — and a method that runs from launch to steady operation — give you the answer you need to decide.",
"각 세션을 눌러 내용을 펼쳐보실 수 있습니다. 오전과 오후 모두 시간까지 확정된 상태입니다.": "Select a session to expand its details. Morning and afternoon times are confirmed.",
"라이브는 커머스에만 머물지 않고 다양한 카테고리의 새로운 산업과 만나 시너지를 내고 있습니다. 라이브가 줄 수 있는 신뢰의 자산을 이제 새로운 가능성으로 확장합니다.": "Live is no longer confined to commerce. It is meeting new industries across categories and creating value together — and the trust live earns is now opening into new possibilities.",
"지난 1년, 라이브는 어떻게 성장을 만들어냈을까요? 성과를 숫자로 돌아보고, 어디에서 어떤 방식으로 성장이 만들어졌는지 그 과정을 짚어봅니다.": "How did live create growth over the past year? We look back at the numbers, and trace where and how that growth was made.",
"일본 최대 뷰티 플랫폼이 라이브커머스를 어떻게 바라보고 있는지, 현지 기업의 시각으로 직접 전합니다. 한국어 통역이 함께 제공됩니다.": "Japan's largest beauty platform on how it sees live commerce — first-hand, from a company on the ground. Korean interpretation is provided.",
"리빙은 구경하는 재미가 큰 만큼 구매까지 가는 길이 긴 카테고리입니다. 오늘의집 라이브가 그 거리를 어떻게 좁혀왔는지, 보는 사람이 사는 사람으로 바뀌는 지점을 짚습니다.": "Living is a category people love to browse, but the path to purchase is long. How live at Ohouse has been closing that distance — and where a viewer turns into a buyer.",
"국경을 넘으면 무엇이 달라지는가. K뷰티를 세계에 파는 회사가 현지에서 통한 방식을 공유합니다.": "What changes the moment you cross a border — how a company selling K-beauty worldwide makes live work in each market.",
"아이에게 쓰는 물건일수록 선택이 신중해집니다. 그 신뢰를 라이브로 어떻게 쌓았는지 공유합니다.": "The more a product is for a child, the more carefully parents choose — how that trust was built through live.",
"플랫폼이 커지는 동안 라이브는 어떤 역할을 맡았는가. 무신사가 지나온 단계와 함께 짚습니다.": "What role did live play as the platform grew? MUSINSA walks through the stages it has been through.",
"팬덤이 매출로 이어지는 지점은 어디인가. 인플루언서가 직접 진행하는 라이브를 어떻게 기획하고 운영하는지, 실제 성과로 이어진 방식과 함께 공유합니다.": "Where fandom turns into revenue — how an influencer-led live is planned and run, and what actually converted.",
"Shoplive가 선보일 AI 기술을 선공개합니다. AI가 라이브 운영을 어디까지 개선할 수 있는지, 그 변화가 브랜드와 고객 경험에서 어떤 가치로 이어지는지 함께 살펴봅니다.": "An early look at the AI Shoplive is about to introduce — how far it can improve live operations, and what that change means for brands and their customers.",
"Shoplive의 최신 AI기능을 직접 체험해보실 수 있는 부스가 점심시간과 쉬는 시간 내내 열려 있습니다.": "Try Shoplive's latest AI features for yourself. The booth stays open through lunch and every break.",
"같은 고민을 하는 브랜드 담당자들과 점심과 네트워킹 시간에 편하게 이야기 나누실 수 있습니다.": "Talk things through over lunch with brand teams working on the same problems.",
"참석해주신 모든 분께 이번 서밋을 기억할 수 있는 기념품을 준비했습니다.": "A keepsake from the Summit for every guest.",
"끝까지 세션을 들으신 분들을 위해 특별한 선물을 준비했어요.": "A special prize draw for everyone who stays to the end.",
"지금 가장 앞서가는 브랜드들의 이야기를 한자리에서 듣고,<br />그 기회를 우리의 비즈니스로 만들고 돌아가는 자리입니다.": "Hear from the brands setting the pace right now,<br />and leave with that opportunity turned into your own.",
"Video Commerce Summit 2026은 이커머스·유통·브랜드 기업의 리더분들을 별도 초청으로 모시는 행사입니다. 초청장을 받으신 분에 한해 아래에서 참석 등록을 하실 수 있습니다.": "Video Commerce Summit 2026 is hosted by invitation for leaders in e-commerce, retail and brand businesses. If you have received an invitation, you can register below.",
"참석이 어려우시거나 동반 참석을 원하시는 경우, 등록 시 함께 알려주시면 자리를 조정해 드립니다.": "If you can no longer attend, or would like to bring a guest, let us know when you register and we will adjust your seat.",
"서울 송파구 올림픽로 300<span class=\"sub\">롯데월드타워 31층 SKY31 CONFERENCE A</span>": "300 Olympic-ro, Songpa-gu, Seoul<span class=\"sub\">SKY31 Conference A, 31F Lotte World Tower</span>",
"10:30 – 11:00<span class=\"sub\">등록 후 바로 프로그램이 시작됩니다</span>": "10:30 – 11:00<span class=\"sub\">The program begins as soon as check-in closes</span>",
"1. 대중교통 이용": "1. By public transport",
"2호선 잠실역 1번 출구 → 지상 이동 → 타워 1F EAST GATE 진입 → 1F 엔젤리너스 옆 등록데스크 확인": "Jamsil Station (Line 2), Exit 1 → walk at ground level → enter the tower through the 1F EAST GATE → the check-in desk is beside Angel-in-us on 1F",
"2. 주차장 이용": "2. By car",
"주차장 진입 → 주차장 B2F ~ B4F 이용 → 지하 SOUTH GATE E/V 탑승(F7, F8호기) → 타워 1F EAST GATE 방향 이동 → 1F 엔젤리너스 옆 등록데스크 확인": "Enter the car park → park on B2F–B4F → take elevator F7 or F8 at the underground SOUTH GATE → head for the 1F EAST GATE of the tower → the check-in desk is beside Angel-in-us on 1F",
"잠실역 하차 → 잠실광역환승센터 MALL 입구 → 서울 스카이 전망대 옆 세븐일레븐 E/S 탑승 → 1F 이동 → 1F 엔젤리너스 옆 등록데스크 확인": "Arrive at Jamsil Station → take the MALL entrance at Jamsil Transfer Centre → take the escalator by the 7-Eleven next to the Seoul Sky observatory → go up to 1F → the check-in desk is beside Angel-in-us on 1F",
"* 별도로 주차권이 지원되지 않고, 행사장 부근이 혼잡할 수 있어 대중교통 이용을 권장드립니다.": "* Parking is not validated and the area around the venue can be busy, so we recommend public transport.",
"별도의 온라인 신청 폼은 운영하지 않습니다. 초청장을 받으신 분에 한해 참석하실 수 있으며, 참석 여부는 초청장에 안내된 담당자에게 회신해 주시면 됩니다.": "There is no open application form. Attendance is limited to invited guests — simply reply to the contact named in your invitation.",
"참가비는 따로 없습니다. 초청드린 분들을 정성껏 모시고 싶어 준비한 자리라, 편안하게 참석해 주시면 됩니다.": "There is no fee. This day is our way of hosting the guests we invited, so please just come as you are.",
"초청 메일에 회신해 알려주시면 감사하겠습니다.": "Please reply to your invitation email and let us know.",
"이번 서밋은 현장 참석만 가능한 오프라인 전용 행사입니다.": "This Summit is offline only — there is no online option.",
"네, 가능합니다. 초청 메일에 회신해 변경하실 분의 성함과 직함을 알려주세요.": "Yes. Reply to your invitation email with the name and title of the person attending instead.",
"이번 서밋은 초청 기업을 대상으로 진행됩니다. 참석을 희망하신다면 <a href=\"#attend\">초청 안내</a>의 문의처로 남겨주시면 안내해 드리겠습니다.": "The Summit is held for invited companies. If you would like to attend, contact us through <a href=\"#attend\">Attendance</a> and we will get back to you.",
"이메일 초청장을 지참해 주시면 원활하게 등록하실 수 있습니다.": "Please bring your email invitation — it makes check-in quicker.",
"앳코스메 등 일본 연사 세션은 일본어로 진행되며, 한국어·영어·일본어 동시통역(AI 기반)이 지원될 예정입니다.": "Sessions by Japanese speakers such as @cosme are delivered in Japanese, with AI-powered simultaneous interpretation in Korean, English and Japanese.",
"10시 30분부터 등록이 시작되며, 11시에 오프닝이 시작됩니다. 등록 후 바로 착석하시면 됩니다.": "Check-in opens at 10:30 and the opening begins at 11:00. Please take your seat once you have checked in.",
"주차는 지원되지 않습니다. 행사장 부근이 혼잡할 수 있어 가급적 대중교통을 이용해 주시길 바랍니다.": "Parking is not provided. The area around the venue can be busy, so please use public transport where possible.",
"개인 기록 용도의 촬영은 가능하나, 세션 발표 내용의 영상 녹화는 제한됩니다.": "Photos for personal record are fine, but video recording of session content is not permitted.",
"점심 시간에 맞춰 도시락을 제공해 드릴 예정입니다.": "A lunch box is served at lunchtime.",
"선착순으로 자유롭게 착석하실 수 있습니다. 다만 원활한 운영을 위해 현장 스태프가 좌석 안내를 드릴 수 있습니다.": "Seating is open on a first-come basis. Our staff may guide you to a seat to keep things running smoothly.",
"<a href=\"https://www.shoplivecorp.com/\" target=\"_blank\" rel=\"noopener\">shoplivecorp.com</a><span class=\"sep\">|</span> <a href=\"https://www.shoplive.cloud/privacy\" target=\"_blank\" rel=\"noopener\">개인정보 처리방침</a>": "<a href=\"https://www.shoplivecorp.com/\" target=\"_blank\" rel=\"noopener\">shoplivecorp.com</a><span class=\"sep\">|</span> <a href=\"https://www.shoplive.cloud/privacy\" target=\"_blank\" rel=\"noopener\">Privacy Policy</a>",
"2026. 10. 2 (금)": "Fri, October 2, 2026",
"롯데월드타워 SKY31": "Lotte World Tower SKY31",
"주최·주관 : SHOPLIVE": "Hosted by SHOPLIVE",
"초대 고객 대상": "By invitation only",
"확장과 기회": "growth and opportunity",
"초청 대상자 등록하기": "Register for the Summit",
"패션": "Fashion",
"연사 협의 중": "Speaker to be announced",
"리빙": "Living",
"유아동": "Baby &amp; Kids",
"인플루언서": "Influencer",
"뷰티/일본": "Beauty / Japan",
"뷰티/한국": "Beauty / Korea",
"솔루션": "Solution",
"라이브커머스로 비즈니스를 혁신하는 방법 확인하기": "See how live commerce reshapes a business",
"다음 프로젝트에 바로 쓸 인사이트 얻기": "Take away insight you can use on your next project",
"글로벌로 넓혀갈 새로운 관계와 기회를 찾고 싶다면": "Find the connections and opportunities that take you global",
"망설임을 확신으로 바꾸기": "Turn hesitation into confidence",
"등록 · 체크인<small>11:00까지 등록을 마치고 바로 시작합니다</small>": "Registration &amp; check-in<small>Check-in closes at 11:00 and the program begins</small>",
"Turn Video into Opportunity<small>김기영 / SHOPLIVE CEO</small>": "Turn Video into Opportunity<small>Kiyoung Kim / SHOPLIVE CEO</small>",
"숫자로 본 라이브, 지난 1년간의 성과<small>김성진 / SHOPLIVE CBO</small>": "Live by the numbers — the past year in results<small>Sungjin Kim / SHOPLIVE CBO</small>",
"팬이 고객으로 바꾸는 순간, 인플루언서 라이브의 운영 노하우<small>이유빈 대표 / 마른파이브</small>": "Turning fans into customers — how influencer live is run<small>Yubin Lee, CEO / Marn5</small>",
"리빙 라이브의 진화, 구경을 넘어 구매로<small>오늘의집</small>": "Living goes further — from browsing to buying<small>Ohouse</small>",
"점심 · 데모부스 운영<small>식사 시간 동안 데모부스가 상시 열려 있습니다</small>": "Lunch &amp; demo booth<small>The demo booth stays open throughout lunch</small>",
"AI로 진화하는 라이브커머스 기술과 고객 가치<small>이규원 / SHOPLIVE CTO</small>": "How AI is reshaping live commerce technology and customer value<small>Kyuwon Lee / SHOPLIVE CTO</small>",
"일본 Beauty Live Commerce의 특징과 인사이트<small>앳코스메 (@cosme)</small>": "Inside Japan's beauty live commerce — what makes it different<small>@cosme</small>",
"쉬는 시간 · 데모부스": "Break &amp; demo booth",
"K뷰티를 세계로, 라이브커머스 전략<small>Silicon2</small>": "Taking K-beauty global with live commerce<small>Silicon2</small>",
"육아 카테고리 라이브커머스 운영 노하우<small>임이랑 대표 / (주)코니바이에린</small>": "Running live commerce in the baby category<small>Irang Lim, CEO / Konny by Erin</small>",
"무신사의 성장과 라이브커머스의 역할<small>MUSINSA 라이브커머스 총괄</small>": "MUSINSA's growth, and the role live commerce played<small>Head of Live Commerce, MUSINSA</small>",
"경품 추첨 · 데모부스 체험 · 자유 네트워킹<small>같은 고민을 하는 분들과 편하게 이야기 나누실 수 있습니다</small>": "Prize draw · demo booth · open networking<small>Time to talk with people working on the same questions</small>",
"행사 종료": "Close",
"롯데월드타워 31층 SKY31 CONFERENCE A": "SKY31 Conference A, 31F Lotte World Tower",
"등록 후 바로 프로그램이 시작됩니다": "The program begins as soon as check-in closes",
"신청 폼이 어디에 있나요?": "Where is the application form?",
"참가비가 있나요?": "Is there a fee?",
"참석이 어려워졌습니다. 어떻게 하나요?": "I can no longer attend. What should I do?",
"온라인으로도 참여할 수 있나요?": "Can I join online?",
"초청받은 기업에서 참석자를 변경할 수 있나요?": "Can we send someone else from our company?",
"초청받지 못했는데 참석하고 싶어요.": "I wasn't invited but would like to attend.",
"등록할 때 무엇을 준비해야 하나요?": "What do I need for check-in?",
"통역이 제공되나요?": "Is interpretation provided?",
"몇 시부터 입장할 수 있나요?": "When can I arrive?",
"주차 지원이 되나요?": "Is parking provided?",
"행사 사진 및 영상 촬영이 가능한가요?": "Can I take photos or video?",
"점심 식사가 제공되나요?": "Is lunch provided?",
"좌석은 지정석인가요?": "Are seats assigned?",
"11:00까지 등록을 마치고 바로 시작합니다": "Check-in closes at 11:00 and the program begins",
"김기영 / SHOPLIVE CEO": "Kiyoung Kim / SHOPLIVE CEO",
"김성진 / SHOPLIVE CBO": "Sungjin Kim / SHOPLIVE CBO",
"이유빈 대표 / 마른파이브": "Yubin Lee, CEO / Marn5",
"오늘의집": "Ohouse",
"식사 시간 동안 데모부스가 상시 열려 있습니다": "The demo booth stays open throughout lunch",
"이규원 / SHOPLIVE CTO": "Kyuwon Lee / SHOPLIVE CTO",
"임이랑 대표 / (주)코니바이에린": "Irang Lim, CEO / Konny by Erin",
"MUSINSA 라이브커머스 총괄": "Head of Live Commerce, MUSINSA",
"앳코스메 (@cosme)": "@cosme",
"세션 상세 확정 예정": "Session details to be confirmed",
"같은 고민을 하는 분들과 편하게 이야기 나누실 수 있습니다": "Time to talk with people working on the same questions",
"초청 안내": "Attendance",
"개인정보 처리방침": "Privacy Policy",
"실행법": "playbook",
"라이브·숏폼 성공 전략": "live &amp; short-form strategy",
"확장과 성장의 기회": "your next growth opportunity",
"김기영": "Kiyoung Kim",
"이규원": "Kyuwon Lee",
"김성진": "Sungjin Kim",
"한 자리에": "together in one room",
"비디오커머스의 미래": "the future of video commerce",
"SKY31 컨벤션": "SKY31 Convention",
"롯데월드타워 31F CONFERENCE A": "Conference A, 31F Lotte World Tower",
"참가 안내": "Attending",
"현장 안내": "On the day",
"경품 추첨은 어떻게 진행되나요?": "How does the prize draw work?",
"마지막 순서(15:00–15:20)에 현장에서 진행합니다. 응모하시려면 <a href=\"https://kr.linkedin.com/company/shoplive\" target=\"_blank\" rel=\"noopener\">Shoplive 링크드인</a> 팔로우가 필요하며, 당첨자는 현장에서 바로 안내해 드립니다. 자리를 비우신 경우 재추첨될 수 있습니다.": "The draw takes place in the room during the closing slot (15:00–15:20). To enter, follow <a href=\"https://kr.linkedin.com/company/shoplive\" target=\"_blank\" rel=\"noopener\">Shoplive on LinkedIn</a>. Winners are announced on the spot, and we redraw if the winner has already left.",
"이번 서밋은 초청 기업을 대상으로 진행됩니다. 참석을 희망하신다면 <a href=\"#attend\">초청 안내</a>의 문의처로 남겨주시면 안내해 드리겠습니다.": "The Summit is hosted for invited companies. If you would like to attend, leave your details with the contact listed under <a href=\"#attend\">Attendance</a> and we will be in touch.",
"참여 조건": "How to enter",
"Shoplive 링크드인 팔로우": "Follow Shoplive on LinkedIn"
},
ja: {
"라이브 기술이 만드는 <span>확장과 기회</span>": "ライブ技術がひらく<span>拡張と成長の機会</span>",
"라이브커머스를 이끄는 리더들이<br /><em>한 자리에</em>": "ライブコマースを牽引するリーダーが<br /><em>一堂に会する</em>",
"Summit을 통해 무엇을 얻어갈 수 있나요?": "Summitで何を持ち帰れますか？",
"Summit에서 만나실 수 있습니다.": "Summitだけでご覧いただけます。",
"10월 2일 단 하루,<br /><em>비디오커머스의 미래</em>를 확인하는 시간": "10月2日、この一日だけ。<br /><em>ビデオコマースの未来</em>を確かめる時間です",
"초청받으신 분들을 위한 자리입니다": "ご招待を受けた方のための場です",
"찾아오시는 길": "アクセス",
"자주 묻는 질문": "よくあるご質問",
"무신사의 성장과 라이브커머스의 역할": "MUSINSAの成長と、ライブコマースが果たした役割",
"리빙 라이브의 진화, 구경을 넘어 구매로": "リビングライブの進化 — 見るだけから買うへ",
"육아 카테고리 라이브커머스 운영 노하우": "育児カテゴリーのライブコマース運営ノウハウ",
"팬이 고객으로 바꾸는 순간, 인플루언서 라이브의 운영 노하우": "ファンを顧客に変える瞬間 — インフルエンサーライブの運営ノウハウ",
"일본 Beauty Live Commerce의 특징과 인사이트": "日本のビューティライブコマース — その特徴とインサイト",
"K뷰티를 세계로, 라이브커머스 전략": "K-ビューティを世界へ、ライブコマース戦略",
"AI로 진화하는 라이브커머스 기술과 고객 가치": "AIで進化するライブコマースの技術と顧客価値",
"숫자로 본 라이브, 지난 1년간의 성과": "数字で見るライブ — この1年の成果",
"데모부스": "デモブース",
"네트워킹 런치": "ネットワーキングランチ",
"기념품": "記念品",
"럭키드로우": "抽選会",
"주소": "住所",
"체크인": "チェックイン",
"1F 지상 이동 시": "1F・地上から向かう場合",
"B1F 쇼핑몰 방향 이동 시": "B1F・ショッピングモール経由の場合",
"<span>2026. 10. 2 (금)</span><i>·</i> <span>롯데월드타워 SKY31</span><i>·</i> <span>주최·주관 : SHOPLIVE</span><i>·</i> <span>초대 고객 대상</span>": "<span>2026年10月2日(金)</span><i>·</i> <span>ロッテワールドタワー SKY31</span><i>·</i> <span>主催 : SHOPLIVE</span><i>·</i> <span>招待制</span>",
"성과를 만들고 있는 플랫폼과 브랜드의 <b>실행법</b>": "成果を出しているプラットフォームとブランドの<b>実行法</b>",
"카테고리별 <b>라이브·숏폼 성공 전략</b>": "カテゴリー別の<b>ライブ・ショート動画 成功戦略</b>",
"한국에서 일본까지, <b>확장과 성장의 기회</b>": "韓国から日本まで、<b>広がる成長とビジネスの機会</b>",
"라이브커머스는 각 산업에서 어떻게 진화하고 있을까요?": "ライブコマースは各業界でどう進化しているのか。",
"Video Commerce Summit 2026은 국내 Video Commerce 시장을 선도해온 리더들과 일본의 주요 뷰티·커머스 기업이 한자리에 모이는 자리입니다.": "Video Commerce Summit 2026は、韓国のビデオコマース市場を牽引してきたリーダーと、日本の主要なビューティ・コマース企業が一堂に会する場です。",
"각자의 시장에서 실제 성과로 증명해온 성공 사례와 인사이트를 공유하고, 이를 바탕으로 한국의 라이브커머스 역량이 아시아 시장으로 확장되는 새로운 교두보를 함께 만들어가고자 합니다.": "それぞれの市場で実際の成果によって証明されてきた事例とインサイトを共有し、韓国のライブコマースの力をアジア市場へ広げる、新たな足がかりをともにつくっていきます。",
"단순히 성공 사례를 ‘듣는’ 자리가 아닙니다.<br />2026년 하반기와 2027년, 무엇을 실행하고 어떻게 성장할 것인지를 함께 고민하고, 새로운 비즈니스 기회와 전략을 구체화하는 자리입니다.": "成功事例をただ「聞く」ための場ではありません。<br />2026年下半期から2027年にかけて、何を実行し、どう成長させるのかをともに考え、新しいビジネスの機会と戦略を形にする場です。",
"라이브커머스 시장이 어디를 향해 나아가고 있는지, Shoplive Video Commerce Summit 에서 가장 먼저 확인하실 수 있습니다.": "ライブコマース市場がどこへ向かっているのか。Shoplive Video Commerce Summitで、いち早くご確認ください。",
"<b>김기영</b> 샵라이브 CEO(대표)": "<b>キム・ギヨン</b> Shoplive CEO",
"<b>이규원</b> 샵라이브 최고기술책임자(CTO)": "<b>イ・ギュウォン</b> Shoplive CTO",
"<b>김성진</b> 샵라이브 비즈니스총괄책임자(CBO)": "<b>キム・ソンジン</b> Shoplive CBO",
"카테고리를 이끄는 브랜드들이 어디서 기회를 찾았고, 그 기회를 어떻게 매출로 연결했는지 직접 확인하세요. 실전 사례를 통해 라이브커머스가 브랜드를 다음 단계로 이끄는 방법을 배울 수 있습니다.": "カテゴリーを牽引するブランドがどこに機会を見つけ、それをどう売上につなげたのか。実例から、ライブコマースがブランドを次の段階へ導く道筋が見えてきます。",
"라이브커머스를 이제 막 시작하셨든 이미 운영 중이든, 지금 단계에 필요한 실전 전략과 카테고리별 방법론을 만나보실 수 있습니다.": "ライブコマースを始めたばかりの方も、すでに運営中の方も、いまの段階に必要な実践的な戦略とカテゴリー別の方法論に出会えます。",
"국내 카테고리 리더는 물론 일본 뷰티·커머스 기업과 한자리에서 교류하며, 한국의 라이브커머스 역량을 글로벌로 넓힐 접점을 만나보세요.": "韓国のカテゴリーリーダーはもちろん、日本のビューティ・コマース企業とも同じ場で交流し、ライブコマースの力を海外へ広げる接点を見つけてください。",
"라이브커머스가 우리 브랜드에 맞을지 확신이 없으신가요? 실제 매출로 이어진 사례와 도입부터 정착까지의 방법론으로, 지금 결정에 필요한 답을 이 자리에서 얻어가실 수 있습니다.": "ライブコマースが自社に合うか迷っていませんか。実際に売上へつながった事例と、導入から定着までの方法論から、いまの判断に必要な答えを持ち帰れます。",
"각 세션을 눌러 내용을 펼쳐보실 수 있습니다. 오전과 오후 모두 시간까지 확정된 상태입니다.": "各セッションをタップすると詳細が開きます。午前・午後とも時間は確定しています。",
"라이브는 커머스에만 머물지 않고 다양한 카테고리의 새로운 산업과 만나 시너지를 내고 있습니다. 라이브가 줄 수 있는 신뢰의 자산을 이제 새로운 가능성으로 확장합니다.": "ライブはコマースにとどまらず、さまざまなカテゴリーの新しい産業と出会い、相乗効果を生んでいます。ライブが築いてきた信頼という資産を、いま新たな可能性へと広げていきます。",
"지난 1년, 라이브는 어떻게 성장을 만들어냈을까요? 성과를 숫자로 돌아보고, 어디에서 어떤 방식으로 성장이 만들어졌는지 그 과정을 짚어봅니다.": "この1年、ライブはどのように成長をつくってきたのか。成果を数字で振り返り、どこでどのように成長が生まれたのか、その過程をたどります。",
"팬덤이 매출로 이어지는 지점은 어디인가. 인플루언서가 직접 진행하는 라이브를 어떻게 기획하고 운영하는지, 실제 성과로 이어진 방식과 함께 공유합니다.": "ファンダムが売上に変わるのはどこか。インフルエンサー自身が進行するライブをどう企画し運営するのか、実際に成果につながった方法とともに共有します。",
"일본 최대 뷰티 플랫폼이 라이브커머스를 어떻게 바라보고 있는지, 현지 기업의 시각으로 직접 전합니다. 한국어 통역이 함께 제공됩니다.": "日本最大のビューティプラットフォームがライブコマースをどう捉えているのか、現地企業の視点でお伝えします。韓国語通訳をご用意します。",
"리빙은 구경하는 재미가 큰 만큼 구매까지 가는 길이 긴 카테고리입니다. 오늘의집 라이브가 그 거리를 어떻게 좁혀왔는지, 보는 사람이 사는 사람으로 바뀌는 지점을 짚습니다.": "リビングは眺める楽しさが大きいぶん、購入までの距離が長いカテゴリーです。Ohouseのライブがその距離をどう縮めてきたのか、見る人が買う人に変わる地点を探ります。",
"국경을 넘으면 무엇이 달라지는가. K뷰티를 세계에 파는 회사가 현지에서 통한 방식을 공유합니다.": "国境を越えると何が変わるのか。K-ビューティを世界へ届ける企業が、現地で通用したやり方を共有します。",
"아이에게 쓰는 물건일수록 선택이 신중해집니다. 그 신뢰를 라이브로 어떻게 쌓았는지 공유합니다.": "子どもが使うものほど、選び方は慎重になります。その信頼をライブでどう積み上げてきたのかを共有します。",
"플랫폼이 커지는 동안 라이브는 어떤 역할을 맡았는가. 무신사가 지나온 단계와 함께 짚습니다.": "プラットフォームが大きくなる過程で、ライブはどんな役割を担ったのか。MUSINSAが通ってきた段階とともに振り返ります。",
"Shoplive가 선보일 AI 기술을 선공개합니다. AI가 라이브 운영을 어디까지 개선할 수 있는지, 그 변화가 브랜드와 고객 경험에서 어떤 가치로 이어지는지 함께 살펴봅니다.": "Shopliveがこれから提供するAI技術を先行公開します。AIがライブ運営をどこまで改善できるのか、その変化がブランドと顧客体験にどのような価値をもたらすのかをご覧いただきます。",
"Shoplive의 최신 AI기능을 직접 체험해보실 수 있는 부스가 점심시간과 쉬는 시간 내내 열려 있습니다.": "ShopliveのAI機能を実際に体験いただけるブースを、昼食時間と休憩時間を通してご用意しています。",
"같은 고민을 하는 브랜드 담당자들과 점심과 네트워킹 시간에 편하게 이야기 나누실 수 있습니다.": "同じ課題に取り組むブランド担当者と、昼食とネットワーキングの時間に気軽にお話しいただけます。",
"참석해주신 모든 분께 이번 서밋을 기억할 수 있는 기념품을 준비했습니다.": "ご参加いただいた皆さまに、このSummitを覚えていただける記念品をご用意しました。",
"끝까지 세션을 들으신 분들을 위해 특별한 선물을 준비했어요.": "最後までご参加いただいた方に、特別なプレゼントをご用意しています。",
"지금 가장 앞서가는 브랜드들의 이야기를 한자리에서 듣고,<br />그 기회를 우리의 비즈니스로 만들고 돌아가는 자리입니다.": "いま最も先を行くブランドの話を一度に聞き、<br />その機会を自社のビジネスにつなげて持ち帰る場です。",
"Video Commerce Summit 2026은 이커머스·유통·브랜드 기업의 리더분들을 별도 초청으로 모시는 행사입니다. 초청장을 받으신 분에 한해 아래에서 참석 등록을 하실 수 있습니다.": "Video Commerce Summit 2026は、EC・流通・ブランド企業のリーダーの皆さまを個別にご招待する催しです。招待状をお受け取りの方に限り、以下からご登録いただけます。",
"참석이 어려우시거나 동반 참석을 원하시는 경우, 등록 시 함께 알려주시면 자리를 조정해 드립니다.": "ご都合が合わなくなった場合や、同伴者をご希望の場合は、ご登録時にお知らせいただければ席を調整いたします。",
"서울 송파구 올림픽로 300<span class=\"sub\">롯데월드타워 31층 SKY31 CONFERENCE A</span>": "ソウル特別市 松坡区 オリンピック路300<span class=\"sub\">ロッテワールドタワー 31階 SKY31 CONFERENCE A</span>",
"10:30 – 11:00<span class=\"sub\">등록 후 바로 프로그램이 시작됩니다</span>": "10:30 – 11:00<span class=\"sub\">受付終了後、そのままプログラムが始まります</span>",
"1. 대중교통 이용": "1. 公共交通機関をご利用の場合",
"2호선 잠실역 1번 출구 → 지상 이동 → 타워 1F EAST GATE 진입 → 1F 엔젤리너스 옆 등록데스크 확인": "地下鉄2号線 蚕室(チャムシル)駅 1番出口 → 地上へ → タワー1F EAST GATEから入館 → 1FのAngel-in-us横の受付デスクへ",
"2. 주차장 이용": "2. お車でお越しの場合",
"주차장 진입 → 주차장 B2F ~ B4F 이용 → 지하 SOUTH GATE E/V 탑승(F7, F8호기) → 타워 1F EAST GATE 방향 이동 → 1F 엔젤리너스 옆 등록데스크 확인": "駐車場へ進入 → B2F〜B4Fに駐車 → 地下SOUTH GATEのエレベーター(F7・F8号機)に乗車 → タワー1F EAST GATE方向へ → 1FのAngel-in-us横の受付デスクへ",
"잠실역 하차 → 잠실광역환승센터 MALL 입구 → 서울 스카이 전망대 옆 세븐일레븐 E/S 탑승 → 1F 이동 → 1F 엔젤리너스 옆 등록데스크 확인": "蚕室駅で下車 → 蚕室広域乗換センターのMALL入口へ → ソウルスカイ展望台横のセブンイレブン前のエスカレーターに乗車 → 1Fへ → 1FのAngel-in-us横の受付デスクへ",
"* 별도로 주차권이 지원되지 않고, 행사장 부근이 혼잡할 수 있어 대중교통 이용을 권장드립니다.": "※ 駐車券のご用意はなく、会場周辺は混雑が予想されるため、公共交通機関のご利用をおすすめします。",
"별도의 온라인 신청 폼은 운영하지 않습니다. 초청장을 받으신 분에 한해 참석하실 수 있으며, 참석 여부는 초청장에 안내된 담당자에게 회신해 주시면 됩니다.": "一般公募の申込フォームはございません。ご招待を受けた方に限りご参加いただけます。ご出欠は、招待状に記載の担当者へご返信ください。",
"참가비는 따로 없습니다. 초청드린 분들을 정성껏 모시고 싶어 준비한 자리라, 편안하게 참석해 주시면 됩니다.": "参加費はいただきません。ご招待した皆さまのためにご用意した場ですので、どうぞお気軽にお越しください。",
"초청 메일에 회신해 알려주시면 감사하겠습니다.": "招待メールにご返信のうえ、お知らせいただけますと幸いです。",
"이번 서밋은 현장 참석만 가능한 오프라인 전용 행사입니다.": "本Summitは会場参加のみのオフライン開催です。",
"네, 가능합니다. 초청 메일에 회신해 변경하실 분의 성함과 직함을 알려주세요.": "はい、可能です。招待メールにご返信いただき、代わりにご参加される方のお名前と役職をお知らせください。",
"이번 서밋은 초청 기업을 대상으로 진행됩니다. 참석을 희망하신다면 <a href=\"#attend\">초청 안내</a>의 문의처로 남겨주시면 안내해 드리겠습니다.": "本Summitはご招待企業を対象に開催しています。ご参加をご希望の場合は<a href=\"#attend\">ご招待について</a>の窓口までご連絡ください。",
"이메일 초청장을 지참해 주시면 원활하게 등록하실 수 있습니다.": "メールでお送りした招待状をご持参いただくと、受付がスムーズです。",
"앳코스메 등 일본 연사 세션은 일본어로 진행되며, 한국어·영어·일본어 동시통역(AI 기반)이 지원될 예정입니다.": "@cosmeなど日本のスピーカーによるセッションは日本語で行われ、韓国語・英語・日本語のAI同時通訳をご用意する予定です。",
"10시 30분부터 등록이 시작되며, 11시에 오프닝이 시작됩니다. 등록 후 바로 착석하시면 됩니다.": "受付は10時30分から、オープニングは11時開始です。受付後はそのままご着席ください。",
"주차는 지원되지 않습니다. 행사장 부근이 혼잡할 수 있어 가급적 대중교통을 이용해 주시길 바랍니다.": "駐車のご用意はございません。会場周辺は混雑が予想されるため、できるだけ公共交通機関をご利用ください。",
"개인 기록 용도의 촬영은 가능하나, 세션 발표 내용의 영상 녹화는 제한됩니다.": "個人の記録のための撮影は可能ですが、セッション内容の動画録画はご遠慮いただいております。",
"점심 식사가 제공되나요?": "昼食は提供されますか？",
"점심 시간에 맞춰 도시락을 제공해 드릴 예정입니다.": "昼食の時間に合わせてお弁当をご用意する予定です。",
"선착순으로 자유롭게 착석하실 수 있습니다. 다만 원활한 운영을 위해 현장 스태프가 좌석 안내를 드릴 수 있습니다.": "先着順の自由席です。円滑な進行のため、スタッフがお席をご案内する場合がございます。",
"<a href=\"https://www.shoplivecorp.com/\" target=\"_blank\" rel=\"noopener\">shoplivecorp.com</a><span class=\"sep\">|</span> <a href=\"https://www.shoplive.cloud/privacy\" target=\"_blank\" rel=\"noopener\">개인정보 처리방침</a>": "<a href=\"https://www.shoplivecorp.com/\" target=\"_blank\" rel=\"noopener\">shoplivecorp.com</a><span class=\"sep\">|</span> <a href=\"https://www.shoplive.cloud/privacy\" target=\"_blank\" rel=\"noopener\">プライバシーポリシー</a>",
"2026. 10. 2 (금)": "2026年10月2日(金)",
"롯데월드타워 SKY31": "ロッテワールドタワー SKY31",
"주최·주관 : SHOPLIVE": "主催 : SHOPLIVE",
"초대 고객 대상": "招待制",
"확장과 기회": "拡張と成長の機会",
"초청 대상자 등록하기": "参加登録へ進む",
"패션": "ファッション",
"연사 협의 중": "スピーカー調整中",
"리빙": "リビング",
"유아동": "ベビー・キッズ",
"인플루언서": "インフルエンサー",
"뷰티/일본": "ビューティ／日本",
"뷰티/한국": "ビューティ／韓国",
"솔루션": "ソリューション",
"라이브커머스로 비즈니스를 혁신하는 방법 확인하기": "ライブコマースでビジネスを変える方法を知る",
"다음 프로젝트에 바로 쓸 인사이트 얻기": "次のプロジェクトにすぐ使えるインサイトを得る",
"글로벌로 넓혀갈 새로운 관계와 기회를 찾고 싶다면": "海外へ広げる関係と機会を見つけたい方へ",
"망설임을 확신으로 바꾸기": "迷いを確信に変える",
"등록 · 체크인<small>11:00까지 등록을 마치고 바로 시작합니다</small>": "受付・チェックイン<small>11:00までに受付を終え、そのまま開始します</small>",
"Turn Video into Opportunity<small>김기영 / SHOPLIVE CEO</small>": "Turn Video into Opportunity<small>キム・ギヨン / SHOPLIVE CEO</small>",
"숫자로 본 라이브, 지난 1년간의 성과<small>김성진 / SHOPLIVE CBO</small>": "数字で見るライブ — この1年の成果<small>キム・ソンジン / SHOPLIVE CBO</small>",
"팬이 고객으로 바꾸는 순간, 인플루언서 라이브의 운영 노하우<small>이유빈 대표 / 마른파이브</small>": "ファンを顧客に変える瞬間 — インフルエンサーライブの運営ノウハウ<small>イ・ユビン代表 / Marn5</small>",
"리빙 라이브의 진화, 구경을 넘어 구매로<small>오늘의집</small>": "リビングライブの進化 — 見るだけから買うへ<small>Ohouse</small>",
"점심 · 데모부스 운영<small>식사 시간 동안 데모부스가 상시 열려 있습니다</small>": "昼食・デモブース<small>お食事の時間もデモブースは常時オープンしています</small>",
"AI로 진화하는 라이브커머스 기술과 고객 가치<small>이규원 / SHOPLIVE CTO</small>": "AIで進化するライブコマースの技術と顧客価値<small>イ・ギュウォン / SHOPLIVE CTO</small>",
"일본 Beauty Live Commerce의 특징과 인사이트<small>앳코스메 (@cosme)</small>": "日本のビューティライブコマース — その特徴とインサイト<small>@cosme</small>",
"쉬는 시간 · 데모부스": "休憩・デモブース",
"K뷰티를 세계로, 라이브커머스 전략<small>Silicon2</small>": "K-ビューティを世界へ、ライブコマース戦略<small>Silicon2</small>",
"육아 카테고리 라이브커머스 운영 노하우<small>임이랑 대표 / (주)코니바이에린</small>": "育児カテゴリーのライブコマース運営ノウハウ<small>イム・イラン代表 / Konny by Erin</small>",
"무신사의 성장과 라이브커머스의 역할<small>MUSINSA 라이브커머스 총괄</small>": "MUSINSAの成長と、ライブコマースが果たした役割<small>MUSINSA ライブコマース統括</small>",
"경품 추첨 · 데모부스 체험 · 자유 네트워킹<small>같은 고민을 하는 분들과 편하게 이야기 나누실 수 있습니다</small>": "抽選会・デモブース体験・自由交流<small>同じ課題を持つ方々と気軽にお話しいただけます</small>",
"행사 종료": "終了",
"롯데월드타워 31층 SKY31 CONFERENCE A": "ロッテワールドタワー 31階 SKY31 CONFERENCE A",
"등록 후 바로 프로그램이 시작됩니다": "受付終了後、そのままプログラムが始まります",
"신청 폼이 어디에 있나요?": "申込フォームはどこにありますか？",
"참가비가 있나요?": "参加費はかかりますか？",
"참석이 어려워졌습니다. 어떻게 하나요?": "参加が難しくなりました。どうすればよいですか？",
"온라인으로도 참여할 수 있나요?": "オンラインでも参加できますか？",
"초청받은 기업에서 참석자를 변경할 수 있나요?": "招待を受けた企業内で参加者を変更できますか？",
"초청받지 못했는데 참석하고 싶어요.": "招待は受けていませんが参加したいです。",
"등록할 때 무엇을 준비해야 하나요?": "受付には何が必要ですか？",
"통역이 제공되나요?": "通訳はありますか？",
"몇 시부터 입장할 수 있나요?": "何時から入場できますか？",
"주차 지원이 되나요?": "駐車場の用意はありますか？",
"행사 사진 및 영상 촬영이 가능한가요?": "写真や動画の撮影はできますか？",
"좌석은 지정석인가요?": "座席は指定ですか？",
"11:00까지 등록을 마치고 바로 시작합니다": "11:00までに受付を終え、そのまま開始します",
"김기영 / SHOPLIVE CEO": "キム・ギヨン / SHOPLIVE CEO",
"김성진 / SHOPLIVE CBO": "キム・ソンジン / SHOPLIVE CBO",
"이유빈 대표 / 마른파이브": "イ・ユビン代表 / Marn5",
"오늘의집": "Ohouse",
"식사 시간 동안 데모부스가 상시 열려 있습니다": "お食事の時間もデモブースは常時オープンしています",
"이규원 / SHOPLIVE CTO": "イ・ギュウォン / SHOPLIVE CTO",
"임이랑 대표 / (주)코니바이에린": "イム・イラン代表 / Konny by Erin",
"MUSINSA 라이브커머스 총괄": "MUSINSA ライブコマース統括",
"앳코스메 (@cosme)": "@cosme",
"세션 상세 확정 예정": "セッション詳細は確定次第",
"같은 고민을 하는 분들과 편하게 이야기 나누실 수 있습니다": "同じ課題を持つ方々と気軽にお話しいただけます",
"초청 안내": "ご招待について",
"개인정보 처리방침": "プライバシーポリシー",
"실행법": "実行法",
"라이브·숏폼 성공 전략": "ライブ・ショート動画 成功戦略",
"확장과 성장의 기회": "広がる成長とビジネスの機会",
"김기영": "キム・ギヨン",
"이규원": "イ・ギュウォン",
"김성진": "キム・ソンジン",
"한 자리에": "一堂に",
"비디오커머스의 미래": "ビデオコマースの未来",
"SKY31 컨벤션": "SKY31 コンベンション",
"롯데월드타워 31F CONFERENCE A": "ロッテワールドタワー 31F CONFERENCE A",
"참가 안내": "参加について",
"현장 안내": "当日について",
"경품 추첨은 어떻게 진행되나요?": "抽選会はどのように行われますか？",
"마지막 순서(15:00–15:20)에 현장에서 진행합니다. 응모하시려면 <a href=\"https://kr.linkedin.com/company/shoplive\" target=\"_blank\" rel=\"noopener\">Shoplive 링크드인</a> 팔로우가 필요하며, 당첨자는 현장에서 바로 안내해 드립니다. 자리를 비우신 경우 재추첨될 수 있습니다.": "最後のプログラム（15:00–15:20）に会場で行います。ご応募には<a href=\"https://kr.linkedin.com/company/shoplive\" target=\"_blank\" rel=\"noopener\">ShopliveのLinkedIn</a>のフォローが必要です。当選者はその場で発表し、ご不在の場合は再抽選となります。",
"이번 서밋은 초청 기업을 대상으로 진행됩니다. 참석을 희망하신다면 <a href=\"#attend\">초청 안내</a>의 문의처로 남겨주시면 안내해 드리겠습니다.": "本サミットは招待企業を対象に開催しています。ご参加をご希望の場合は、<a href=\"#attend\">ご招待について</a>に記載の連絡先までお知らせください。",
"참여 조건": "参加条件",
"Shoplive 링크드인 팔로우": "ShopliveのLinkedInをフォロー"
}
};

/* 언어 전환 — 한국어 원문을 키로 EN/JA 치환 */
(function () {
  var DICT = window.I18N;
  var LABEL = { ko: '한국어', en: 'English', ja: '日本語' };
  var nodes = [];
  function norm(s) { return s.replace(/<br\s*\/?>/gi, '<br />').replace(/\s+/g, ' ').trim(); }
  function index(d) { var o = {}; for (var k in d) o[norm(k)] = d[k]; return o; }
  var IDX = { en: index(DICT.en), ja: index(DICT.ja) };

  var all = document.querySelectorAll('h1,h2,h3,h4,p,span,small,a,b,em,li,dt,dd,strong,button,summary');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    if (el.parentNode && el.parentNode.closest && el.parentNode.closest('[data-i18n]')) continue;
    var html = norm(el.innerHTML);
    if (!html || html.indexOf('<img') >= 0 || html.indexOf('<svg') >= 0) continue;
    if (!/[가-힣]/.test(html)) continue;
    if (!IDX.en[html] && !IDX.ja[html]) continue;
    el.setAttribute('data-i18n', '');
    nodes.push({ el: el, ko: html });
  }

  function apply(lang) {
    document.documentElement.lang = lang;
    for (var i = 0; i < nodes.length; i++) {
      var t = lang === 'ko' ? nodes[i].ko : (IDX[lang][nodes[i].ko] || nodes[i].ko);
      if (norm(nodes[i].el.innerHTML) !== t) nodes[i].el.innerHTML = t;
    }
    var cur = document.querySelector('.lang-cur');
    if (cur) cur.textContent = LABEL[lang];
    var btns = document.querySelectorAll('[data-set-lang]');
    for (var j = 0; j < btns.length; j++) {
      btns[j].setAttribute('aria-current', btns[j].getAttribute('data-set-lang') === lang ? 'true' : 'false');
    }
    try { localStorage.setItem('vcs-lang', lang); } catch (e) {}
    if (window.__fitHero) window.__fitHero();
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-set-lang]');
    if (!b) return;
    apply(b.getAttribute('data-set-lang'));
    var menu = document.querySelector('.lang-menu');
    var btn = document.querySelector('.lang-btn');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });

  var saved = null;
  try { saved = localStorage.getItem('vcs-lang'); } catch (e) {}
  if (!saved) {
    var nav = (navigator.language || '').toLowerCase();
    if (nav.indexOf('ja') === 0) saved = 'ja';
  }
  apply(saved || 'ko');
})();

/* 타임테이블 — 마우스를 올리면 설명이 열린다 */
(function () {
  if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;
  var items = document.querySelectorAll('.tt details:not(.no-toggle)');
  for (var i = 0; i < items.length; i++) {
    (function (d) {
      if (d.open) d.setAttribute('data-pinned', '1');
      d.addEventListener('mouseenter', function () { if (!d.hasAttribute('data-pinned')) d.open = true; });
      d.addEventListener('mouseleave', function () { if (!d.hasAttribute('data-pinned')) d.open = false; });
      var s = d.querySelector('summary');
      if (s) s.addEventListener('click', function () {
        setTimeout(function () {
          if (d.open) d.setAttribute('data-pinned', '1');
          else d.removeAttribute('data-pinned');
        }, 0);
      });
    })(items[i]);
  }
})();
