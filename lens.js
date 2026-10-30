// 원형 렌즈: 무대 가운데 보이지 않는 그림(가로 2.9:1)을 깔고, 정해 둔 네 곳을 차례로 비춤
// 다음 곳으로는 빠르게(살짝 흔들리며) 옮겨 가고, 각 곳에서는 렌즈를 키워 2~3초 머묾
const stage = document.querySelector(".band");
const lens = stage.querySelector(".lens");
const video = lens.querySelector("video");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

const RATIO = 2.9;   // 그림 가로:세로
const SMALL = 0.23;  // 옮겨 갈 때 렌즈 지름(그림 폭 기준)
const BIG = 0.32;    // 머물 때 렌즈 지름 — 그림 높이(0.345)보다 작아야 그림 밖이 안 보임
const SPOTS = [      // 렌즈 중심, 그림 폭·높이 기준 0~1
  [0.148, 0.684],    // 왼쪽 망치 든 일꾼
  [0.491, 0.336],    // 가운데 밸브와 연기
  [0.695, 0.667],    // 로봇 일꾼 뒷모습
  [0.854, 0.587],    // 오른쪽 두 일꾼
];
const MOVE = 750;    // 옮겨 가는 시간(ms)
const SHAKE = 0.007; // 옮겨 갈 때 흔들림 크기(그림 폭 기준)

let img = { x: 0, y: 0, w: 0, h: 0 };
let state = { u: SPOTS[0][0], v: SPOTS[0][1], d: BIG, jx: 0, jy: 0 };

function size() {
  const W = stage.clientWidth, H = stage.clientHeight;
  const w = Math.min(W * (W > 1024 ? 0.68 : 1), H * 0.9 * RATIO);
  img = { w, h: w / RATIO, x: (W - w) / 2, y: (H - w / RATIO) / 2 };
  video.style.width = img.w + "px";
  video.style.height = img.h + "px";
  draw();
}

// 렌즈가 그림 밖으로 나가지 않게 중심을 안쪽으로 당김
function draw() {
  const D = state.d * img.w, r = D / 2;
  const cx = Math.min(img.w - r, Math.max(r, state.u * img.w)) + state.jx * img.w;
  const cy = Math.min(img.h - r, Math.max(r, state.v * img.h)) + state.jy * img.w;
  const x = img.x + cx - r, y = img.y + cy - r;
  lens.style.width = lens.style.height = D + "px";
  lens.style.transform = `translate(${x}px, ${y}px)`;
  video.style.transform = `translate(${img.x - x}px, ${img.y - y}px)`;
}

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let i = 0;
function next() {
  const from = SPOTS[i], to = SPOTS[i = (i + 1) % SPOTS.length];
  const t0 = performance.now(), seed = Math.random() * 100;
  (function step(now) {
    const t = Math.min(1, (now - t0) / MOVE), k = ease(t), mid = Math.sin(Math.PI * t);
    const s = (now - t0) / 1000 + seed;
    state = {
      u: from[0] + (to[0] - from[0]) * k,
      v: from[1] + (to[1] - from[1]) * k,
      d: BIG - (BIG - SMALL) * Math.min(1, mid * 1.6), // 떠날 때 줄고 도착하며 다시 커짐
      // 손에 든 망원경처럼: 이동 중간에 가장 크게 흔들리고 도착하면 멎음
      jx: SHAKE * mid * (Math.sin(s * 23) + 0.6 * Math.sin(s * 41 + 1.3)),
      jy: SHAKE * mid * (Math.sin(s * 19 + 2.1) + 0.6 * Math.sin(s * 37)),
    };
    draw();
    if (t < 1) requestAnimationFrame(step);
    else setTimeout(next, 2000 + Math.random() * 1000);
  })(t0);
}

size();
addEventListener("resize", size);
new ResizeObserver(size).observe(stage);
if (!still) setTimeout(next, 2500);
