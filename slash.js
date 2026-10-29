// 커서를 빠르게 휘두르면 칼자국이 남고, 크게 베면 화면이 그 선을 따라 갈라졌다 붙음
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const TRAIL_MS = 140;      // 칼자국이 남는 시간
  const SLASH_SPEED = 2.2;   // px/ms — 이보다 빠르면 '베기'
  const SLASH_MIN = 180;     // 베기로 치는 최소 길이(px)

  const page = document.querySelector(".page");
  const cv = document.createElement("canvas");
  cv.className = "slash-layer";
  document.body.append(cv);
  const ctx = cv.getContext("2d");
  let W = 0, H = 0;

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  size();
  addEventListener("resize", size);

  const pts = [];
  const cuts = [];
  let lastCut = 0;

  // 손가락은 마우스보다 느리고 화면이 작아서 기준을 낮춤
  const touchMin = () => Math.min(SLASH_MIN, Math.min(innerWidth, innerHeight) * 0.3);
  let down = null, cutThisStroke = false;

  addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse") return;
    pts.length = 0; // 앞선 터치와 이어지지 않게
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    cutThisStroke = false;
  }, { passive: true });

  addEventListener("pointermove", e => {
    const touch = e.pointerType !== "mouse";
    // 휴대폰은 이벤트가 듬성듬성 와서 사이 좌표까지 모음
    const list = e.getCoalescedEvents?.() || [];
    for (const c of list.length ? list : [e]) pts.push({ x: c.clientX, y: c.clientY, t: c.timeStamp || performance.now() });
    detect(e.timeStamp || performance.now(), touch);
  }, { passive: true });

  // 빠르게 튕긴 짧은 터치는 움직이는 동안 기준을 못 넘기도 해서, 손을 뗄 때 한 번 더 판정
  const release = e => {
    if (e.pointerType === "mouse" || !down) return;
    const now = performance.now(), b = { x: e.clientX, y: e.clientY, t: now };
    const dist = Math.hypot(b.x - down.x, b.y - down.y);
    if (!cutThisStroke && now - lastCut >= 650 && dist >= touchMin() && now - down.t < 450) {
      lastCut = now;
      slash(down, b, now);
    }
    down = null;
  };
  addEventListener("pointerup", release, { passive: true });
  addEventListener("pointercancel", release, { passive: true });

  function detect(now, touch) {
    if (now - lastCut < 650) return;
    const min = touch ? touchMin() : SLASH_MIN;
    const speedMin = touch ? 0.9 : SLASH_SPEED;
    const recent = pts.filter(p => now - p.t < 90);
    if (recent.length < 2) return;
    const a = recent[0], b = recent[recent.length - 1];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist < min * 0.4 || dist / (b.t - a.t || 1) < speedMin) return;
    // 같은 방향으로 이어진 구간 전체를 베기 길이로
    const stroke = pts.filter(p => now - p.t < 260);
    const s = stroke[0];
    if (Math.hypot(b.x - s.x, b.y - s.y) < min) return;
    lastCut = now;
    cutThisStroke = true;
    slash(s, b, now);
  }

  // 휘두른 길이보다 조금 긴 베기 선 + 글자 가르기
  function slash(a, b, now) {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const u = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const reach = Math.min(len * 0.7, Math.max(W, H) * 0.45);
    cuts.push({ from: { x: mid.x - u.x * reach, y: mid.y - u.y * reach }, to: { x: mid.x + u.x * reach, y: mid.y + u.y * reach }, t: now });
    split(mid, u, Math.hypot(W, H) * 2);
    // 베인 선을 따라 작은 파편이 양쪽으로 살짝 튐
    const n = { x: -u.y, y: u.x };
    for (let i = 0; i < 16; i++) {
      const along = (Math.random() * 2 - 1) * reach * 0.8;
      const side = Math.random() < 0.5 ? -1 : 1;
      const sp = 0.08 + Math.random() * 0.22;              // px/ms
      const fwd = (Math.random() * 0.6 + 0.2) * sp;         // 휘두른 방향으로 조금 끌려감
      bits.push({
        x: mid.x + u.x * along, y: mid.y + u.y * along,
        vx: n.x * side * sp + u.x * fwd, vy: n.y * side * sp + u.y * fwd - 0.05,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.03,
        s: 2 + Math.random() * 4, t: now, life: 420 + Math.random() * 380,
        blue: Math.random() < 0.3,
      });
    }
    spew(now);
  }

  // ME 위쪽에서 만화 토사물처럼 초록 물줄기가 짧게 뿜어져 나옴
  const GOO = "#9ccc3c", GOO_LIGHT = "#d4ec7e", GOO_DARK = "#6e9a22", LINE = "#1b1b1b";
  let gush = null;
  const drops = [];
  function spew(now) {
    const chars = [...document.querySelectorAll(".page:not(.half) #mark .ch")].filter(c => c.textContent.trim());
    const me = chars.slice(-2);
    if (me.length < 2) return;
    const r1 = me[0].getBoundingClientRect(), r2 = me[1].getBoundingClientRect();
    const k = Math.max(0.55, Math.min(1.6, (r2.right - r1.left) / 190)); // ME 폭에 맞춘 크기
    const o = { x: r1.left + (r2.right - r1.left) * 0.45, y: Math.min(r1.top, r2.top) + (r2.bottom - r2.top) * 0.1 };
    // 위로 조금 솟았다가 왼쪽으로 넓게 휘어 아래로 쏟아지는 곡선
    const P = [o, { x: o.x - 10 * k, y: o.y - 130 * k }, { x: o.x - 190 * k, y: o.y - 150 * k }, { x: o.x - 240 * k, y: o.y + 30 * k }];
    gush = { P, k, t: now, dy: 0, vy: 0, ph: Math.random() * 6 };
    // 입에서 처음 튀는 방울
    for (let i = 0; i < 5; i++) drops.push({ x: o.x, y: o.y, vx: (Math.random() - 0.3) * 0.35, vy: -0.25 - Math.random() * 0.3, r: (2 + Math.random() * 3) * k, t: now });
  }
  const bez = (P, f) => {
    const g = 1 - f;
    return {
      x: g * g * g * P[0].x + 3 * g * g * f * P[1].x + 3 * g * f * f * P[2].x + f * f * f * P[3].x,
      y: g * g * g * P[0].y + 3 * g * g * f * P[1].y + 3 * g * f * f * P[2].y + f * f * f * P[3].y,
    };
  };
  // 물줄기 몸통(울퉁불퉁한 폭) + 둥근 끝 + 아래로 늘어지는 방울 손가락, 조각마다 따로 그림
  function goo(list, wAt) {
    const L = [], R = [], n = list.length - 1;
    for (let i = 0; i <= n; i++) {
      const p = list[i], q = list[Math.min(i + 1, n)], o = list[Math.max(i - 1, 0)];
      const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1;
      const w = wAt(i / n);
      L.push([p.x - dy / d * w, p.y + dx / d * w]);
      R.push([p.x + dy / d * w, p.y - dx / d * w]);
    }
    const body = new Path2D();
    body.moveTo(...L[0]);
    L.forEach(q => body.lineTo(...q));
    R.reverse().forEach(q => body.lineTo(...q));
    body.closePath();
    const parts = [body];
    const e = list[n], f = list[Math.max(0, n - 2)], ew = wAt(1);
    const dx = e.x - f.x, dy = e.y - f.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    const cap = new Path2D(); cap.ellipse(e.x, e.y, ew, ew * 0.9, 0, 0, Math.PI * 2); parts.push(cap);
    for (const [side, len] of [[-0.62, 0.9], [-0.15, 1.5], [0.35, 1.15], [0.75, 0.7]]) {
      const drip = new Path2D();
      drip.ellipse(e.x + nx * ew * side, e.y + ny * ew * side + ew * len * 0.55, ew * 0.3, ew * len * 0.75, 0, 0, Math.PI * 2);
      parts.push(drip);
    }
    return parts;
  }
  function drawGush(now, dt) {
    if (gush) {
      const age = now - gush.t, { P, k } = gush;
      const head = Math.min(1, age / 170);                         // 0.17초 동안 뻗어 나감
      const tail = age < 340 ? 0 : Math.min(1, (age - 340) / 260); // 그다음 입에서 떨어져 쏟아짐
      if (age > 340) { gush.vy += 0.0025 * dt; gush.dy += gush.vy * dt; }
      if (tail >= 1) gush = null;
      else {
        const list = [];
        for (let i = 0; i <= 32; i++) {
          const p = bez(P, tail + (head - tail) * i / 32);
          list.push({ x: p.x, y: p.y + gush.dy * (i / 32) });
        }
        const ph = gush.ph;
        const wAt = f => { const g = tail + (head - tail) * f; return (4 + 26 * g * g) * k * (1 + 0.16 * Math.sin(g * 22 + ph)); };
        // 굵은 검은 테두리를 먼저, 그 위에 초록을 채워 한 덩어리처럼
        const parts = goo(list, wAt);
        ctx.lineWidth = 4.5; ctx.lineJoin = "round"; ctx.strokeStyle = LINE;
        parts.forEach(q => ctx.stroke(q));
        ctx.fillStyle = GOO;
        parts.forEach(q => ctx.fill(q));
        // 어두운 얼룩과 밝은 결
        ctx.fillStyle = GOO_DARK;
        for (let j = 0; j < 6; j++) {
          const f = 0.3 + j * 0.11; if (f > head - tail) break;
          const p = list[Math.round(f * 32)], w = wAt(f);
          ctx.beginPath(); ctx.ellipse(p.x + Math.sin(j * 2.3 + ph) * w * 0.35, p.y + Math.cos(j * 1.7) * w * 0.3, w * 0.22, w * 0.13, j, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = GOO_LIGHT; ctx.lineWidth = 2.5 * k; ctx.lineCap = "round";
        ctx.beginPath();
        list.slice(2, -4).forEach((p, i) => { const y = p.y - wAt(i / 32) * 0.5; i ? ctx.lineTo(p.x, y) : ctx.moveTo(p.x, y); });
        ctx.stroke();
        ctx.globalAlpha = 1;
        // 물줄기 끝에서 방울이 떨어짐
        if (age < 420 && Math.random() < dt / 30) {
          const e = list[list.length - 1];
          drops.push({ x: e.x + (Math.random() - 0.5) * 30 * k, y: e.y, vx: (Math.random() - 0.6) * 0.15, vy: Math.random() * 0.1, r: (2 + Math.random() * 4) * k, t: now });
        }
      }
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], age = now - d.t;
      if (age > 700 || d.y > H + 20) { drops.splice(i, 1); continue; }
      d.vy += 0.0018 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      ctx.globalAlpha = Math.min(1, (700 - age) / 200);
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r * 0.8, d.r * 1.15, 0, 0, Math.PI * 2);
      ctx.fillStyle = GOO; ctx.fill();
      ctx.lineWidth = 1.6; ctx.strokeStyle = LINE; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  const bits = [];
  function drawBits(now, dt) {
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i], age = now - b.t;
      if (age > b.life) { bits.splice(i, 1); continue; }
      b.vy += 0.0006 * dt; // 아주 약한 중력
      b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      ctx.save();
      ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.globalAlpha = 1 - age / b.life;
      ctx.fillStyle = b.blue ? BLUE : "#1b1b1b";
      // 가늘고 뾰족한 조각
      ctx.beginPath();
      ctx.moveTo(-b.s, 0); ctx.lineTo(0, -b.s * 0.35); ctx.lineTo(b.s * 0.8, b.s * 0.15); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  let mendTimer, endTimer;
  function heal() {
    document.querySelectorAll(".half").forEach(x => x.remove());
    page.classList.remove("cutting");
  }

  function split(p, u, L) {
    const n = { x: -u.y, y: u.x };
    const half = (sign) => {
      const A = { x: p.x - u.x * L, y: p.y - u.y * L };
      const B = { x: p.x + u.x * L, y: p.y + u.y * L };
      const C = { x: B.x + n.x * L * sign, y: B.y + n.y * L * sign };
      const D = { x: A.x + n.x * L * sign, y: A.y + n.y * L * sign };
      const el = page.cloneNode(true);
      el.querySelectorAll("[id]").forEach(x => x.removeAttribute("id"));
      el.classList.add("half");
      el.setAttribute("aria-hidden", "true");
      el.style.clipPath = `polygon(${[A, B, C, D].map(q => `${q.x}px ${q.y}px`).join(",")})`;
      document.body.append(el);
      // 두 조각이 베인 선을 따라 서로 반대로 미끄러지고 살짝 벌어짐
      const slide = 16 * sign, gap = 4 * sign;
      void el.offsetWidth; // 시작 위치를 먼저 그려야 전환이 보임
      el.style.transform = `translate(${u.x * slide + n.x * gap}px, ${u.y * slide + n.y * gap}px)`;
      return el;
    };
    // 어떤 순서로 베어도 원래 글자는 항상 정해진 시간 안에 돌아옴
    clearTimeout(mendTimer); clearTimeout(endTimer);
    heal();
    const halves = [half(1), half(-1)];
    page.classList.add("cutting");
    mendTimer = setTimeout(() => halves.forEach(el => { el.classList.add("mend"); el.style.transform = "none"; }), 260);
    endTimer = setTimeout(heal, 760);
  }

  // 애니 swoosh 한 줄: 파란 초승달 + 한쪽으로 치우친 밝은 심. 끝은 뾰족, 머리 쪽이 굵음
  const BLUE = "#1f6bff", CORE = "#8fe9ff";
  function band(list, maxW, shift, color) {
    const left = [], right = [];
    const n = list.length - 1;
    for (let i = 0; i <= n; i++) {
      const p = list[i], q = list[Math.min(i + 1, n)], o = list[Math.max(i - 1, 0)];
      const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1;
      const f = i / n;
      const w = maxW * Math.pow(Math.sin(Math.PI * f), 0.8) * (0.35 + 0.65 * f) * 0.5;
      const nx = -dy / d, ny = dx / d, c = w * shift;
      left.push([p.x + nx * (c - w), p.y + ny * (c - w)]);
      right.push([p.x + nx * (c + w), p.y + ny * (c + w)]);
    }
    ctx.beginPath();
    ctx.moveTo(...left[0]);
    left.forEach(q => ctx.lineTo(...q));
    right.reverse().forEach(q => ctx.lineTo(...q));
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function stroke(list, maxW, alpha) {
    if (list.length < 2) return;
    ctx.globalAlpha = alpha;
    band(list, maxW, 0, BLUE);
    band(list, maxW * 0.45, 0.9, CORE);
    ctx.globalAlpha = 1;
  }

  let lastFrame = 0;
  function frame(now) {
    const dt = Math.min(now - (lastFrame || now), 50);
    lastFrame = now;
    ctx.clearRect(0, 0, W, H);
    drawBits(now, dt);
    drawGush(now, dt);
    while (pts.length && now - pts[0].t > TRAIL_MS) pts.shift();
    // 칼자국 길이는 최대 260px
    let run = 0;
    for (let i = pts.length - 1; i > 0; i--) {
      run += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (run > 260) { pts.splice(0, i); break; }
    }
    // 빠르게 움직일수록 굵어짐
    if (pts.length > 2) {
      const a = pts[0], b = pts[pts.length - 1];
      const speed = Math.hypot(b.x - a.x, b.y - a.y) / (b.t - a.t || 1);
      if (speed > 0.5) stroke(pts, Math.min(3 + speed * 4, 16), Math.min(1, speed / 1.5));
    }
    for (let i = cuts.length - 1; i >= 0; i--) {
      const c = cuts[i], age = now - c.t;
      if (age > 520) { cuts.splice(i, 1); continue; }
      // 0~90ms 선이 뻗어 나가고, 그 뒤 가늘어지며 사라짐
      const grow = Math.min(1, age / 90);
      const fade = age < 90 ? 1 : 1 - (age - 90) / 430;
      const end = { x: c.from.x + (c.to.x - c.from.x) * grow, y: c.from.y + (c.to.y - c.from.y) * grow };
      const steps = 24, line = [];
      // 살짝 휘어진 호(초승달 swoosh)
      const lx = end.x - c.from.x, ly = end.y - c.from.y, bow = Math.hypot(lx, ly) * 0.07;
      const ln = Math.hypot(lx, ly) || 1;
      for (let k = 0; k <= steps; k++) {
        const f = k / steps, b = Math.sin(Math.PI * f) * bow;
        line.push({ x: c.from.x + lx * f - ly / ln * b, y: c.from.y + ly * f + lx / ln * b });
      }
      stroke(line, 10 * fade, fade);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
