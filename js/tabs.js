// On-screen keyboard handling for dialogs, and switching tabs.
// ---------- on-screen keyboard: keep dialogs inside the visible area ----------
// The keyboard shrinks the visual viewport; track its height/offset in CSS vars and flag "kb" while it's up.
// The field being typed in is scrolled to the top of its dialog so what's below it (suggestions) stays visible.
let vvMax = 0;
function fitViewport() {
  const v = window.visualViewport;
  if (!v) return;
  vvMax = Math.max(vvMax, v.height);
  const r = document.documentElement;
  r.style.setProperty('--vvh', v.height + 'px');
  r.style.setProperty('--vvt', v.offsetTop + 'px');
  r.classList.toggle('kb', v.height < vvMax * 0.78);
}
if (window.visualViewport) {
  visualViewport.addEventListener('resize', fitViewport);
  visualViewport.addEventListener('scroll', fitViewport);
  fitViewport();
}
addEventListener('orientationchange', () => {
  vvMax = 0;
  setTimeout(fitViewport, 300);
});
document.addEventListener('focusin', (e) => {
  const f = e.target,
    d = f.closest && f.closest('dialog');
  if (!d || !f.matches('input:not([type=color]),textarea')) return;
  const go = () => {
    const dr = d.getBoundingClientRect(),
      fr = f.getBoundingClientRect();
    d.scrollTo({ top: d.scrollTop + fr.top - dr.top - 16, behavior: 'smooth' });
  };
  setTimeout(go, 350); // after the keyboard has opened
});

// ---------- tabs ----------
const SWT = ['g', 't', 'd'],
  SWN = { g: 'Groceries', t: 'To-dos', d: 'Recipes' },
  PANE = { g: '#paneG', t: '#paneT', d: '#paneD' };
let tab = load('cl_tab', 'g');
function setTab(t, dir) {
  const prev = tab;
  tab = SWT.includes(t) ? t : 'g';
  save('cl_tab', tab);
  SWT.forEach((k) => ($(PANE[k]).hidden = k !== tab));
  document.querySelectorAll('.tab').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on);
  });
  if (dir && prev !== tab) {
    const p = $(PANE[tab]);
    p.classList.remove('inL', 'inR');
    void p.offsetWidth;
    p.classList.add(dir > 0 ? 'inR' : 'inL');
  }
}
document
  .querySelectorAll('.tab')
  .forEach((b) =>
    b.addEventListener('click', () => setTab(b.dataset.tab, SWT.indexOf(b.dataset.tab) > SWT.indexOf(tab) ? 1 : -1)),
  );
