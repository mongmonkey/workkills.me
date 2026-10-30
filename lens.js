// 원형 렌즈: 무대 안을 천천히 떠돌며(사인 여러 개를 섞은 느린 경로) 같은 자리의 영상만 보여줌
const stage = document.querySelector(".band");
const lens = stage.querySelector(".lens");
const video = lens.querySelector("video");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
let W = 0, H = 0, D = 0;

function size() {
  W = stage.clientWidth; H = stage.clientHeight; D = lens.offsetWidth;
  video.style.width = W + "px";
  video.style.height = H + "px";
}

// 0~1 사이를 느리게 오가는 값: 주기가 다른 사인 셋을 섞어 같은 길을 반복하지 않게
const wander = (t, a, b, c) => 0.5 + 0.5 * (0.55 * Math.sin(t / a) + 0.3 * Math.sin(t / b + 1.7) + 0.15 * Math.sin(t / c + 4.1));

function place(t) {
  const x = (W - D) * (still ? 0.3 : wander(t, 7.1, 3.3, 1.9));
  const y = (H - D) * (still ? 0.5 : wander(t, 5.3, 2.7, 1.3 + 0.2));
  lens.style.transform = `translate(${x}px, ${y}px)`;
  video.style.transform = `translate(${-x}px, ${-y}px)`;
}

size();
addEventListener("resize", size);
new ResizeObserver(size).observe(stage);
const t0 = performance.now();
function frame(now) { place((now - t0) / 1000 + 12); if (!still) requestAnimationFrame(frame); }
requestAnimationFrame(frame);
