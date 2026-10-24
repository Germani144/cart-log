// Touch gestures: swallowing stray taps after a drag, and swiping between tabs.
// right after a drag, the phone may send a stray tap to whatever is under the finger (e.g. the to-do input,
// which would pop up the keyboard): swallow taps and focus for a moment
['mousedown', 'click', 'pointerdown'].forEach((t) =>
  document.addEventListener(
    t,
    (e) => {
      if (Date.now() < ignoreTapsUntil && !dragState) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  ),
);
document.addEventListener(
  'focusin',
  (e) => {
    if (Date.now() < ignoreTapsUntil && e.target.matches && e.target.matches('input,textarea')) e.target.blur();
  },
  true,
);

// swipe left/right to change tab, with live feedback: the page follows the finger, a label names the next tab,
// and it lights up once the swipe is long enough to switch.
const SWIPE_THRESHOLD = 70;
const currentPane = () => $(TAB_PANES[currentTab]);
const tabButton = (k) => document.querySelector('.tab[data-tab="' + k + '"]');
let swipeState = null;
function resetSwipe() {
  const p = swipeState && swipeState.p;
  if (p) {
    p.style.transition = 'transform .18s,opacity .18s';
    p.style.transform = '';
    p.style.opacity = '';
  }
  $('#swh')?.remove();
  TAB_ORDER.forEach((k) => tabButton(k)?.classList.remove('nx'));
  swipeState = null;
}
document.addEventListener(
  'touchstart',
  (e) => {
    swipeState = null;
    if (
      e.touches.length !== 1 ||
      !(
        !e.target.closest('input,textarea,dialog,[contenteditable]') &&
        e.touches[0].clientX > 24 &&
        e.touches[0].clientX < innerWidth - 24 &&
        listCode &&
        !$('#main').hidden &&
        !dragState
      )
    )
      return;
    const t = e.touches[0];
    swipeState = { x: t.clientX, y: t.clientY, m: 1, d: 0, p: currentPane() };
  },
  { passive: true },
);
document.addEventListener(
  'touchmove',
  (e) => {
    if (!swipeState) return;
    const t = e.touches[0],
      dx = t.clientX - swipeState.x,
      dy = t.clientY - swipeState.y;
    if (swipeState.m === 1) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        swipeState = null;
        return;
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      swipeState.m = 2;
      swipeState.p.style.transition = 'none';
    }
    const j = TAB_ORDER.indexOf(currentTab) + (dx < 0 ? 1 : -1),
      ok = j >= 0 && j < TAB_ORDER.length,
      k = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
    swipeState.d = ok ? dx : 0;
    swipeState.p.style.transform = `translateX(${dx * (ok ? 0.55 : 0.15)}px)`;
    swipeState.p.style.opacity = ok ? 1 - 0.35 * k : 1;
    TAB_ORDER.forEach((x, n) => tabButton(x)?.classList.toggle('nx', ok && n === j && k >= 1));
    let h = $('#swh');
    if (!h) {
      h = document.createElement('div');
      h.id = 'swh';
      document.body.appendChild(h);
    }
    if (ok) {
      h.textContent = (dx < 0 ? '' : '‹ ') + TAB_NAMES[TAB_ORDER[j]] + (dx < 0 ? ' ›' : '');
      h.className = (dx < 0 ? 'r' : 'l') + (k >= 1 ? ' go' : '');
      h.style.opacity = Math.min(1, k * 1.4);
    } else h.style.opacity = 0;
  },
  { passive: true },
);
document.addEventListener(
  'touchend',
  () => {
    if (!swipeState) return;
    if (swipeState.m !== 2) {
      swipeState = null;
      return;
    }
    const dx = swipeState.d,
      j = TAB_ORDER.indexOf(currentTab) + (dx < 0 ? 1 : -1);
    if (
      Math.abs(dx) >= SWIPE_THRESHOLD &&
      j >= 0 &&
      j < TAB_ORDER.length &&
      !(dragState || Date.now() < ignoreTapsUntil)
    ) {
      const p = swipeState.p;
      p.style.transition = '';
      p.style.transform = '';
      p.style.opacity = '';
      $('#swh')?.remove();
      TAB_ORDER.forEach((k) => tabButton(k)?.classList.remove('nx'));
      swipeState = null;
      setTab(TAB_ORDER[j], j > TAB_ORDER.indexOf(currentTab) ? 1 : -1);
    } else resetSwipe();
  },
  { passive: true },
);
document.addEventListener('touchcancel', resetSwipe, { passive: true });
