// 워드마크를 화면 폭에 꽉 맞춤
const mark = document.getElementById("mark");
const h1 = mark.parentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

function fit() {
  h1.style.fontSize = "100px";
  const avail = h1.clientWidth;
  h1.style.fontSize = (100 * avail / mark.getBoundingClientRect().width) + "px";
}

// 글자(워드마크)나 단어(서브 텍스트)를 하나씩 감쌈 — KILLS 같은 안쪽 span은 유지
function split(el, byWord) {
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      const parts = byWord ? node.textContent.split(/(\s+)/) : [...node.textContent];
      for (const c of parts) {
        if (!c) continue;
        if (byWord && /^\s+$/.test(c)) { frag.append(c); continue; } // 단어 사이에서 줄바꿈되게
        const s = document.createElement("span");
        s.className = "ch";
        s.textContent = c;
        frag.append(s);
      }
      node.replaceWith(frag);
    } else split(node, byWord);
  }
}

document.fonts.ready.then(() => {
  split(mark, false);
  document.querySelectorAll(".sub > span").forEach(el => split(el, true));
  fit();
  document.body.classList.add("ready");
  if (!reduce) drift();
});
addEventListener("resize", fit);

// Contact 버튼: 가만히 있으면 3~7초마다 눈 깜빡이듯(가끔 두 번)
const contact = document.querySelector(".contact");
if (!reduce) {
  let lastInput = performance.now();
  const touch = () => { lastInput = performance.now(); };
  addEventListener("pointermove", touch, { passive: true });
  addEventListener("keydown", touch);
  const blink = () => {
    const idle = performance.now() - lastInput > 1500;
    if (idle && !contact.matches(":hover, :focus-visible")) {
      const cls = Math.random() < 0.3 ? "blink2" : "blink";
      contact.classList.remove("blink", "blink2");
      void contact.offsetWidth;
      contact.classList.add(cls);
      setTimeout(() => contact.classList.remove(cls), 600);
    }
    setTimeout(blink, 3000 + Math.random() * 4000);
  };
  setTimeout(blink, 2500);
}

// 가만히 있으면 글자들이 슬쩍슬쩍 떠다니고, 움직이면 제자리로
function drift() {
  const chars = [...document.querySelectorAll(".page:not(.half) .ch")].map((el, i) => ({
    el, big: !!el.closest(".mark"),
    p1: Math.random() * 6.28, p2: Math.random() * 6.28, s: 0.6 + Math.random() * 0.5, i,
  }));
  let lastMove = performance.now(), calm = 0;
  addEventListener("pointermove", () => { lastMove = performance.now(); }, { passive: true });
  addEventListener("keydown", () => { lastMove = performance.now(); });

  const tick = now => {
    const target = now - lastMove > 1200 ? 1 : 0;
    calm += (target - calm) * (target ? 0.012 : 0.12);  // 천천히 떠오르고 빠르게 돌아옴
    const t = now / 1000;
    const em = parseFloat(h1.style.fontSize) || 100;
    for (const c of chars) {
      if (calm < 0.002) { c.el.style.transform = ""; continue; }
      const amp = (c.big ? em * 0.018 : 0.8) * calm;
      const y = Math.sin(t * c.s + c.p1) * amp;
      const x = Math.sin(t * c.s * 0.7 + c.p2) * amp * 0.3;
      const r = c.big ? Math.sin(t * c.s * 0.8 + c.p2) * 0.8 * calm : 0;
      c.el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg)`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
