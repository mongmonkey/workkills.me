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

  addEventListener("pointermove", e => {
    const now = performance.now();
    pts.push({ x: e.clientX, y: e.clientY, t: now });
    detect(now);
  }, { passive: true });

  function detect(now) {
    if (now - lastCut < 650) return;
    const recent = pts.filter(p => now - p.t < 90);
    if (recent.length < 3) return;
    const a = recent[0], b = recent[recent.length - 1];
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist < SLASH_MIN * 0.5 || dist / (b.t - a.t || 1) < SLASH_SPEED) return;
    // 같은 방향으로 이어진 구간 전체를 베기 길이로
    const stroke = pts.filter(p => now - p.t < 220);
    const s = stroke[0];
    if (Math.hypot(b.x - s.x, b.y - s.y) < SLASH_MIN) return;
    lastCut = now;
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

  function frame(now) {
    ctx.clearRect(0, 0, W, H);
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
