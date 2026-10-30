// 원형 렌즈: 무대 가운데 보이지 않는 그림(가로 2.9:1)을 깔고, 정해 둔 네 곳을 차례로 비춤
// 다음 곳으로는 빠르게 옮겨 가고, 각 곳에서 2~3초 머묾
const stage = document.querySelector(".band");
const lens = stage.querySelector(".lens");
const video = lens.querySelector("video");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

const RATIO = 2.9;   // 그림 가로:세로
const LENS = 0.23;   // 렌즈 지름 = 그림 폭의 23%
const SPOTS = [      // 렌즈 중심, 그림 폭·높이 기준 0~1
  [0.148, 0.684],    // 왼쪽 망치 든 일꾼
  [0.491, 0.336],    // 가운데 밸브와 연기
  [0.695, 0.667],    // 로봇 일꾼 뒷모습
  [0.854, 0.587],    // 오른쪽 두 일꾼
];
const MOVE = 650;    // 옮겨 가는 시간(ms)

let img = { x: 0, y: 0, w: 0, h: 0 }, D = 0;
function size() {
  const W = stage.clientWidth, H = stage.clientHeight;
  const w = Math.min(W * (W > 1024 ? 0.68 : 1), H * 0.9 * RATIO);
  img = { w, h: w / RATIO, x: (W - w) / 2, y: (H - w / RATIO) / 2 };
  D = w * LENS;
  lens.style.width = lens.style.height = D + "px";
  video.style.width = img.w + "px";
  video.style.height = img.h + "px";
  place(pos);
}

let pos = SPOTS[0];
function place([u, v]) {
  const x = img.x + u * img.w - D / 2, y = img.y + v * img.h - D / 2;
  lens.style.transform = `translate(${x}px, ${y}px)`;
  video.style.transform = `translate(${img.x - x}px, ${img.y - y}px)`;
}

const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let i = 0;
function next() {
  const from = SPOTS[i], to = SPOTS[i = (i + 1) % SPOTS.length];
  const t0 = performance.now();
  (function step(now) {
    const k = ease(Math.min(1, (now - t0) / MOVE));
    pos = [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k];
    place(pos);
    if (k < 1) requestAnimationFrame(step);
    else setTimeout(next, 2000 + Math.random() * 1000);
  })(t0);
}

size();
addEventListener("resize", size);
new ResizeObserver(size).observe(stage);
if (!still) setTimeout(next, 2500);
