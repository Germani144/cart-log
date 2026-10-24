// To-dos tab: lists (shared and private), headings, folding, editing and hold-and-drag reordering.
// ---------- to-dos: ordered lists; numbered i., ii., … by position; ticked ones sink to "Done" ----------
// "Home" (id main) is the original shared list: its to-dos have no list field. Extra lists are described by
// meta docs "tl_<id>" {id,kind:'tl',name,emoji,ts}: shared ones under the list code (lists/{code}/meta + todos),
// private ones under this phone's own code (lists/{me}/meta + todos), which only this phone knows.
const TODO_MAX = 50;
const TL_EMO = ['📝', '🚲', '🔧', '🏠', '🛒', '💼', '🎁', '✈️', '🏋️', '📚', '🌱', '💡'];
const tlMain = () => ({
  id: 'main',
  name: 'Home',
  emoji: '🏠',
  priv: false,
  ...(meta.tl_main ? { name: meta.tl_main.name, emoji: meta.tl_main.emoji, title: meta.tl_main.title } : {}),
});
function tlAll() {
  const sh = Object.values(meta)
    .filter((v) => v.kind === 'tl' && v.id !== 'tl_main')
    .map((v) => ({ ...v, priv: false }));
  const pr = me
    ? Object.values(pmeta)
        .filter((v) => v.kind === 'tl')
        .map((v) => ({ ...v, priv: true }))
    : [];
  return [tlMain(), ...[...sh, ...pr].sort((a, b) => (a.ts || 0) - (b.ts || 0))];
}
let curTL = load('cl_tdlist', 'main');
const tlCur = () => tlAll().find((l) => l.id === curTL) || tlMain();
const tlOf = (id) => tlAll().find((l) => l.id === (id || 'main'));
const tlView = () => {
  const l = tlCur();
  return (l.priv ? ptodos : todos).filter((t) => (t.list || 'main') === l.id);
};
const roman = (n) => {
  let s = '';
  for (const [v, r] of [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ])
    while (n >= v) {
      s += r;
      n -= v;
    }
  return s;
};
const todoById = (id) => todos.find((t) => t.id === id) || ptodos.find((t) => t.id === id);
const todoOpen = () =>
  tlView()
    .filter((t) => !t.done)
    .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.ts || 0) - (b.ts || 0) || (a.id < b.id ? -1 : 1));
let tdEditing = null,
  tdDirty = false,
  drag = null,
  hold = null,
  suppressClickUntil = 0;
function putTodo(t) {
  const l = tlOf(t.list);
  if (!l) return;
  if (l.priv) {
    const i = ptodos.findIndex((x) => x.id === t.id);
    if (i < 0) ptodos.push(t);
    else ptodos[i] = t;
    save('cl_ptodos', ptodos);
    renderTodos();
    putP('todos', t);
  } else {
    const i = todos.findIndex((x) => x.id === t.id);
    if (i < 0) todos.push(t);
    else todos[i] = t;
    save('cl_todos', todos);
    renderTodos();
    put('todos', t);
  }
}
function removeTodo(id) {
  if (ptodos.some((x) => x.id === id)) {
    ptodos = ptodos.filter((x) => x.id !== id);
    save('cl_ptodos', ptodos);
    renderTodos();
    delP('todos', id);
  } else {
    todos = todos.filter((x) => x.id !== id);
    save('cl_todos', todos);
    renderTodos();
    del('todos', id);
  }
}
// folded headings: per phone, {headingId:true}
var tdFolded = load('cl_folded', {});
// headings (head:true) are section titles inside a list: no tick box, never "done", don't count as to-dos
const isItem = (t) => !t.head;
function addTodo(text, head) {
  text = text.trim();
  if (!text || (!head && todoOpen().filter(isItem).length >= TODO_MAX)) return false;
  const l = tlCur();
  if (!head) {
    const v = todoOpen();
    for (let k = v.length - 1; k >= 0; k--)
      if (v[k].head) {
        if (tdFolded[v[k].id]) {
          delete tdFolded[v[k].id];
          save('cl_folded', tdFolded);
        }
        break;
      }
  } // new items land in the last section: unfold it
  putTodo({
    id: uid(),
    text,
    done: false,
    order: tlView().reduce((m, t) => Math.max(m, t.order || 0), 0) + 1000,
    ts: Date.now(),
    ...(head ? { head: true } : {}),
    ...(l.id === 'main' ? {} : { list: l.id }),
  });
  return true;
}
function renderTodos() {
  if (!listCode) return;
  if (drag || tdEditing) {
    tdDirty = true;
    return;
  } // never rebuild the DOM under a finger or a cursor
  tdDirty = false;
  drawTL();
  const open = todoOpen(),
    done = tlView()
      .filter((t) => t.done)
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const nItems = open.filter(isItem).length;
  // folded headings (per phone): their items stay in the list (so drag keeps sections together) but hidden
  const sec = {};
  let cur = null;
  open.forEach((t) => {
    if (t.head) cur = t.id;
    else if (cur) sec[cur] = (sec[cur] || 0) + 1;
  });
  let hide = false;
  $('#tdOpen').innerHTML = open.length
    ? open
        .map((t) => {
          if (t.head) hide = !!tdFolded[t.id];
          return t.head
            ? `<div class="td hd${hide ? ' closed' : ''}" data-id="${esc(t.id)}"><button class="hcv" data-hc="${esc(t.id)}" aria-label="${hide ? 'Unfold' : 'Fold'}" aria-expanded="${!hide}">▾</button><div class="tdt" data-xe="${esc(t.id)}">${esc(t.text)}</div>${hide && sec[t.id] ? `<span class="hcn">${sec[t.id]}</span>` : ''}<span class="hdn"></span><button class="x" data-xd="${esc(t.id)}" aria-label="Delete heading">✕</button></div>`
            : `<div class="td${hide ? ' cz' : ''}" data-id="${esc(t.id)}"><button class="tchk" data-xt="${esc(t.id)}" aria-label="Done"></button><span class="rn">•</span><div class="tdt" data-xe="${esc(t.id)}">${esc(t.text)}</div><button class="x" data-xd="${esc(t.id)}" aria-label="Delete">✕</button></div>`;
        })
        .join('')
    : '<div class="empty">Nothing to do 🎉<br>Add a to-do above.</div>';
  $('#tdN').textContent = nItems ? ` · ${nItems}` : '';
  $('#tdTip').textContent = open.length > 1 ? 'hold & drag to reorder' : '';
  $('#tdDoneCard').hidden = !done.length;
  $('#tdDoneN').textContent = ` · ${done.length}`;
  $('#tdDone').innerHTML = done
    .map(
      (t) =>
        `<div class="td done" data-id="${esc(t.id)}"><button class="tchk" data-xt="${esc(t.id)}" aria-label="Undo">✓</button><div class="tdt">${esc(t.text)}</div><button class="x" data-xd="${esc(t.id)}" aria-label="Delete">✕</button></div>`,
    )
    .join('');
  const full = nItems >= TODO_MAX && !tdHeadMode;
  $('#tdNew').disabled = full;
  $('#tdNew').placeholder = full
    ? 'List is full (50). Tick or delete one first'
    : tdHeadMode
      ? 'Add a heading…'
      : 'Add an item…';
  $('#tdHint').textContent = nItems >= 40 ? `${nItems} of ${TODO_MAX}` : '';
  $('#cntT').textContent = nItems || '';
}
// H button: the next entry becomes a heading; it switches back to normal to-dos after one heading
var tdHeadMode = false;
function setHeadMode(on) {
  tdHeadMode = on;
  $('#tdHeadBtn').setAttribute('aria-pressed', on);
  $('#tdNew').classList.toggle('hdm', on);
  renderTodos();
}
$('#tdHeadBtn').addEventListener('pointerdown', (e) => e.preventDefault()); // keep the keyboard open
$('#tdHeadBtn').onclick = () => {
  setHeadMode(!tdHeadMode);
  $('#tdNew').focus();
};
// paste several lines at once: "- text" (or •, *) lines become to-dos, other lines headings; a bare "-" is skipped
function parseTodoText(txt) {
  const out = [];
  for (let line of txt.split(/\r?\n/)) {
    line = line.trim();
    if (!line) continue;
    const m = /^[-•*–]\s*(.*)$/.exec(line);
    if (m) {
      const t = m[1].trim();
      if (t) out.push({ text: t, head: false });
    } else out.push({ text: line.replace(/:$/, ''), head: true });
  }
  return out;
}
$('#tdNew').addEventListener('paste', (e) => {
  const txt = (e.clipboardData || window.clipboardData)?.getData('text') || '';
  if (!/\n/.test(txt.trim())) return; // single line: normal paste
  e.preventDefault();
  const rows = parseTodoText(txt),
    nh = rows.filter((r) => r.head).length,
    ni = rows.length - nh;
  const room = TODO_MAX - todoOpen().filter(isItem).length;
  if (!rows.length) return;
  if (ni > room)
    return alert(`That's ${ni} to-dos, but this list only has room for ${room} more (max ${TODO_MAX} open).`);
  if (!confirm(`Add ${nh} heading${nh === 1 ? '' : 's'} and ${ni} to-do${ni === 1 ? '' : 's'} to "${tlCur().name}"?`))
    return;
  rows.forEach((r) => addTodo(r.text, r.head));
  $('#tdNew').value = '';
  setHeadMode(false);
});
$('#tdForm').onsubmit = (e) => {
  e.preventDefault();
  const i = $('#tdNew');
  if (addTodo(i.value, tdHeadMode)) {
    i.value = '';
    if (tdHeadMode) setHeadMode(false);
  }
  i.focus();
};
$('#tdClear').onclick = () => {
  const d = tlView().filter((t) => t.done);
  if (d.length && confirm(`Remove ${d.length} done to-do${d.length > 1 ? 's' : ''}?`))
    d.forEach((t) => removeTodo(t.id));
};

// list chips: tap to switch, tap the current one to edit it, ＋ to make a new list
function drawTL() {
  const ls = tlAll();
  if (!ls.some((l) => l.id === curTL)) {
    curTL = 'main';
    save('cl_tdlist', curTL);
  }
  $('#tlChips').innerHTML =
    ls
      .map(
        (l) =>
          `<button type="button" class="chip${l.id === curTL ? ' on' : ''}" data-tl="${esc(l.id)}">${esc(l.emoji || '📝')} ${esc(l.name)}${l.priv ? ' 🔒' : ''}</button>`,
      )
      .join('') + `<button type="button" class="chip add" data-tl="+">＋ New list</button>`;
  const c = tlCur();
  $('#tdTitle').textContent = tlTitle(c) + (c.priv ? ' 🔒' : '');
}
let tl = null; // dialog state {id|null, name, emoji, priv}
// the title on the list card: its own title if set, else "To do" for Home and the list's name for the others.
// Tap it to rename; it's stored on the list (shared lists sync it, private ones stay private).
const tlTitle = (l) => l.title || (l.id === 'main' ? 'To do' : l.name);
function renameListTitle() {
  const l = tlCur(),
    v = prompt('Title of this list', tlTitle(l));
  if (v == null) return;
  const t = v.trim().replace(/\s+/g, ' ').slice(0, 40);
  if (l.id === 'main') {
    const d = { id: 'tl_main', kind: 'tlmain', name: l.name, emoji: l.emoji, ...(t ? { title: t } : {}) };
    meta.tl_main = d;
    save('cl_meta', meta);
    put('meta', d);
  } else {
    const src = l.priv ? pmeta : meta,
      old = src[l.id];
    if (!old) return;
    const { title, ...rest } = old;
    const d = { ...rest, ...(t ? { title: t } : {}) };
    src[l.id] = d;
    if (l.priv) {
      save('cl_pmeta', pmeta);
      putP('meta', d);
    } else {
      save('cl_meta', meta);
      put('meta', d);
    }
  }
  renderTodos();
}
$('#tdTitle').onclick = () => {
  if (Date.now() >= suppressClickUntil) renameListTitle();
};
$('#tdTitle').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') renameListTitle();
});
function tlOpen(l) {
  tl = l ? { id: l.id, emoji: l.emoji || '📝', priv: l.priv } : { id: null, emoji: '📝', priv: true };
  $('#tlHead').textContent = l ? 'Edit list' : 'New list';
  $('#tlName').value = l ? l.name : '';
  $('#tlKindBox').hidden = !!l;
  $('#tlDel').hidden = !l || l.id === 'main';
  tlDraw();
  $('#tlDlg').showModal();
  $('#tlHead').focus();
}
function tlDraw() {
  $('#tlEmo').innerHTML = TL_EMO.map(
    (e) => `<button type="button" class="chip${e === tl.emoji ? ' sel' : ''}" data-te="${e}">${e}</button>`,
  ).join('');
  document
    .querySelectorAll('#tlDlg [data-tk]')
    .forEach((b) => b.classList.toggle('sel', (b.dataset.tk === 'priv') === tl.priv));
  $('#tlKindHint').textContent = tl.priv
    ? "Stays on your phone's private code: other phones on this list never see it."
    : 'Everyone with the list code sees it, like the Home list.';
}
$('#tlChips').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tl]');
  if (!b) return;
  const id = b.dataset.tl;
  if (id === '+') return tlOpen(null);
  if (id === curTL) return tlOpen(tlCur());
  curTL = id;
  save('cl_tdlist', curTL);
  renderTodos();
});
$('#tlDlg').addEventListener('click', (e) => {
  const em = e.target.closest('[data-te]'),
    k = e.target.closest('[data-tk]');
  if (em) {
    tl.emoji = em.dataset.te;
    tlDraw();
  }
  if (k) {
    tl.priv = k.dataset.tk === 'priv';
    tlDraw();
  }
});
function tlSave() {
  const name = $('#tlName').value.trim().replace(/\s+/g, ' ').slice(0, 30);
  if (!name) return $('#tlName').focus();
  if (tl.id === 'main') {
    const d = {
      id: 'tl_main',
      kind: 'tlmain',
      name,
      emoji: tl.emoji,
      ...(tlMain().title ? { title: tlMain().title } : {}),
    };
    meta.tl_main = d;
    save('cl_meta', meta);
    put('meta', d);
  } else {
    const old = tl.id && tlOf(tl.id),
      priv = old ? old.priv : tl.priv;
    const d = {
      id: tl.id || 'tl_' + uid(),
      kind: 'tl',
      name,
      emoji: tl.emoji,
      ts: old ? old.ts : Date.now(),
      ...(old && old.title ? { title: old.title } : {}),
    };
    if (priv) {
      const first = !me;
      if (first) {
        me = newCode();
        save('cl_me', me);
      } // first private list: this phone gets its own code
      pmeta[d.id] = d;
      save('cl_pmeta', pmeta);
      putP('meta', d);
      if (first) connect();
    } else {
      meta[d.id] = d;
      save('cl_meta', meta);
      put('meta', d);
    }
    curTL = d.id;
    save('cl_tdlist', curTL);
  }
  $('#tlDlg').close();
  renderTodos();
}
$('#tlSave').onclick = tlSave;
$('#tlName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    tlSave();
  }
});
$('#tlCancel').onclick = () => $('#tlDlg').close();
$('#tlDel').onclick = () => {
  const l = tlOf(tl.id);
  if (!l || l.id === 'main') return;
  const mine = (l.priv ? ptodos : todos).filter((t) => t.list === l.id);
  if (!confirm(`Delete "${l.name}"${mine.length ? ` and its ${mine.length} to-do${mine.length > 1 ? 's' : ''}` : ''}?`))
    return;
  mine.forEach((t) => removeTodo(t.id));
  if (l.priv) {
    delete pmeta[l.id];
    save('cl_pmeta', pmeta);
    delP('meta', l.id);
  } else {
    delete meta[l.id];
    save('cl_meta', meta);
    del('meta', l.id);
  }
  curTL = 'main';
  save('cl_tdlist', curTL);
  $('#tlDlg').close();
  renderTodos();
};

// tap the text to edit it in place
function tdEdit(id) {
  const t = todoById(id),
    box = document.querySelector(`#tdOpen .td[data-id="${id}"] .tdt`);
  if (!t || !box || tdEditing) return;
  tdEditing = id;
  const ta = document.createElement('textarea');
  ta.className = 'tded';
  ta.rows = 1;
  ta.value = t.text;
  ta.enterKeyHint = 'done';
  box.replaceWith(ta);
  const fit = () => {
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };
  ta.oninput = fit;
  fit();
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  let fin = false;
  const finish = (save) => {
    if (fin) return;
    fin = true;
    tdEditing = null;
    const v = ta.value.trim();
    if (save && v && v !== t.text) putTodo({ ...t, text: v });
    else renderTodos();
  };
  ta.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      finish(false);
    }
  };
  ta.onblur = () => finish(true);
}

$('#tdOpen').addEventListener('click', (e) => {
  const b = e.target.closest('[data-hc]');
  if (!b || Date.now() < suppressClickUntil) return;
  const id = b.dataset.hc;
  if (tdFolded[id]) delete tdFolded[id];
  else tdFolded[id] = true;
  save('cl_folded', tdFolded);
  renderTodos();
});
// hold a row, then drag it. Only a stationary press starts a drag, so normal swipes still scroll the page.
const lst = $('#tdOpen');
function tdPress(el, x, y, touch) {
  tdPressCancel();
  const h = { el, x, y, ly: y, touch };
  h.timer = setTimeout(
    () => {
      if (hold === h) {
        hold = null;
        tdBegin(h.el, h.ly);
      }
    },
    touch ? 330 : 220,
  );
  hold = h;
}
function tdPressCancel() {
  if (hold) {
    clearTimeout(hold.timer);
    hold = null;
  }
}
// a heading carries its section (the rows after it, up to the next heading): they fold away while dragging,
// the heading moves past whole sections, and the rows unfold under it when dropped
const isHd = (n) => n && n.classList.contains('hd');
function tdBegin(el, y) {
  if (tdEditing || !el.isConnected) return;
  const group = [];
  if (isHd(el)) {
    for (let n = el.nextElementSibling; n && !isHd(n); n = n.nextElementSibling) group.push(n);
  }
  // keep the page the same height while the section is folded, so the heading stays under the finger
  const top0 = el.getBoundingClientRect().top,
    hid = group.reduce((h, n) => h + n.offsetHeight, 0);
  if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  if (hid) lst.style.paddingBottom = hid + 'px';
  group.forEach((n) => (n.style.display = 'none'));
  const shift = el.getBoundingClientRect().top - top0;
  if (Math.abs(shift) > 1) scrollBy(0, shift);
  if (group.length) el.querySelector('.hdn').textContent = `+${group.length} to-do${group.length > 1 ? 's' : ''}`;
  drag = { el, id: el.dataset.id, startY: y + scrollY, cy: y, raf: 0, group };
  el.classList.add('lift');
  document.body.classList.add('dragging');
  try {
    navigator.vibrate && navigator.vibrate(12);
  } catch {}
  drag.raf = requestAnimationFrame(tdAuto);
}
function tdFlip(n, mut) {
  const a = n.offsetTop;
  mut();
  const b = n.offsetTop;
  if (a === b) return;
  n.style.transition = 'none';
  n.style.transform = `translateY(${a - b}px)`;
  void n.offsetHeight;
  n.style.transition = 'transform .16s ease';
  n.style.transform = '';
}
// the block next to the dragged heading: a whole section (heading + rows), or loose rows above the first heading
function blockAfter(el) {
  const last = drag.group.length ? drag.group[drag.group.length - 1] : el;
  const f = last.nextElementSibling;
  if (!f) return null;
  const b = [f];
  for (let n = f.nextElementSibling; n && !isHd(n); n = n.nextElementSibling) b.push(n);
  return b;
}
// loose rows above the first heading stay on top: a section never moves above them
function blockBefore(el) {
  const b = [];
  for (let n = el.previousElementSibling; n; n = n.previousElementSibling) {
    b.unshift(n);
    if (isHd(n)) return b;
  }
  return null;
}
const isVis = (n) => n.offsetParent !== null;
const blockMid = (b) => {
  const v = b.filter(isVis);
  if (!v.length) return -1e9;
  const l = v[v.length - 1];
  return (v[0].offsetTop + l.offsetTop + l.offsetHeight) / 2;
};
const blockH = (b) => {
  const v = b.filter(isVis);
  if (!v.length) return 0;
  const l = v[v.length - 1];
  return l.offsetTop + l.offsetHeight - v[0].offsetTop;
};
const isFolded = (n) => n && n.classList.contains('closed');
function itemBlockAfter(el) {
  const n = el.nextElementSibling;
  if (!n) return null;
  if (!isFolded(n)) return [n];
  const b = [n];
  for (let m = n.nextElementSibling; m && m.classList.contains('cz'); m = m.nextElementSibling) b.push(m);
  return b;
}
function itemBlockBefore(el) {
  const n = el.previousElementSibling;
  if (!n) return null;
  if (!n.classList.contains('cz')) return [n];
  const b = [];
  for (let m = n; m; m = m.previousElementSibling) {
    b.unshift(m);
    if (isHd(m)) break;
  }
  return b;
}
function tdApplySection() {
  const d = drag,
    el = d.el;
  for (let g = 0; g < 60; g++) {
    const c = el.offsetTop + el.offsetHeight / 2 + (d.cy + scrollY - d.startY);
    const nb = blockAfter(el),
      pb = blockBefore(el);
    if (nb && c > blockMid(nb)) {
      const h = blockH(nb);
      const ref = el;
      nb.forEach((n) => tdFlip(n, () => lst.insertBefore(n, ref)));
      d.startY += h;
      continue;
    }
    if (pb && c < blockMid(pb)) {
      const h = blockH(pb);
      const after = (d.group.length ? d.group[d.group.length - 1] : el).nextSibling;
      pb.forEach((n) => tdFlip(n, () => lst.insertBefore(n, after)));
      d.startY -= h;
      continue;
    }
    break;
  }
  el.style.transform = `translateY(${d.cy + scrollY - d.startY}px)`;
}
function tdApply() {
  const d = drag;
  if (!d) return;
  const el = d.el;
  if (isHd(el)) return tdApplySection();
  for (let g = 0; g < 60; g++) {
    const c = el.offsetTop + el.offsetHeight / 2 + (d.cy + scrollY - d.startY);
    // a folded section counts as one block (its heading plus hidden items), so an item hops over it whole
    const nb = itemBlockAfter(el),
      pb = itemBlockBefore(el);
    if (nb && c > blockMid(nb)) {
      const h = blockH(nb);
      nb.forEach((n) => tdFlip(n, () => lst.insertBefore(n, el)));
      d.startY += h;
      continue;
    }
    if (pb && c < blockMid(pb)) {
      const h = blockH(pb),
        ref = el.nextSibling;
      pb.forEach((n) => tdFlip(n, () => lst.insertBefore(n, ref)));
      d.startY -= h;
      continue;
    }
    break;
  }
  el.style.transform = `translateY(${d.cy + scrollY - d.startY}px)`;
}
function tdMove(y) {
  if (drag) {
    drag.cy = y;
    tdApply();
  }
}
function tdAuto() {
  // scroll the page while the finger is near the top or bottom edge
  if (!drag) return;
  const y = drag.cy,
    h = innerHeight,
    edge = 90;
  let v = 0;
  if (y < edge) v = -Math.ceil(((edge - y) / edge) * 16);
  else if (y > h - edge) v = Math.ceil(((y - (h - edge)) / edge) * 16);
  if (v) {
    const b = scrollY;
    scrollBy(0, v);
    if (scrollY !== b) tdApply();
  }
  drag.raf = requestAnimationFrame(tdAuto);
}
function tdEnd() {
  const d = drag;
  if (!d) return;
  drag = null;
  cancelAnimationFrame(d.raf);
  suppressClickUntil = Date.now() + 600;
  d.el.classList.remove('lift');
  document.body.classList.remove('dragging');
  d.el.style.transform = '';
  if (isHd(d.el)) {
    let ref = d.el.nextSibling;
    d.group.forEach((n) => {
      lst.insertBefore(n, ref);
      n.style.display = '';
    }); // unfold under the heading
    lst.style.paddingBottom = '';
    return tdCommitSection(
      [d.id, ...d.group.map((n) => n.dataset.id)],
      [...lst.children].map((r) => r.dataset.id),
    );
  }
  tdCommit(
    d.id,
    [...lst.children].map((r) => r.dataset.id),
  );
}
// a moved section: the heading and its rows get evenly spaced orders between the new neighbours (in their order)
function tdCommitSection(sec, ids) {
  const i = ids.indexOf(sec[0]),
    j = i + sec.length - 1;
  if (i < 0) return renderTodos();
  const p = i > 0 ? todoById(ids[i - 1]) : null,
    n = j < ids.length - 1 ? todoById(ids[j + 1]) : null;
  const a = p ? p.order : null,
    b = n ? n.order : null,
    cur = sec.map(todoById);
  if (cur.some((x) => !x)) return renderTodos();
  const inPlace =
    cur.every((x, k) => (k === 0 ? a == null || a < x.order : cur[k - 1].order < x.order)) &&
    (b == null || cur[cur.length - 1].order < b);
  if (inPlace) return renderTodos();
  if (a != null && b != null && (b - a) / (sec.length + 1) < 1e-6) {
    ids.forEach((x, k) => {
      const q = todoById(x);
      if (q && q.order !== (k + 1) * 1000) putTodo({ ...q, order: (k + 1) * 1000 });
    });
    return;
  }
  const start = a == null ? (b == null ? 0 : b - 1000 * (sec.length + 1)) : a,
    step = a == null || b == null ? 1000 : (b - a) / (sec.length + 1);
  cur.forEach((x, k) => putTodo({ ...x, order: start + step * (k + 1) }));
}
// only the moved row gets a new order value (halfway between its new neighbours), so two phones editing at once don't clash
function tdCommit(id, ids) {
  const i = ids.indexOf(id),
    t = todoById(id);
  if (i < 0 || !t) return renderTodos();
  const p = i > 0 ? todoById(ids[i - 1]) : null,
    n = i < ids.length - 1 ? todoById(ids[i + 1]) : null;
  const a = p ? p.order : null,
    b = n ? n.order : null;
  if ((a == null || a < t.order) && (b == null || t.order < b)) return renderTodos();
  if (a != null && b != null && Math.abs(b - a) < 1e-6) {
    ids.forEach((x, k) => {
      const q = todoById(x);
      if (q && q.order !== (k + 1) * 1000) putTodo({ ...q, order: (k + 1) * 1000 });
    });
    return;
  }
  putTodo({
    ...t,
    order: a == null && b == null ? 1000 : a == null ? b - 1000 : b == null ? a + 1000 : (a + b) / 2,
  });
}
lst.addEventListener(
  'touchstart',
  (e) => {
    const el = e.target.closest('.td');
    if (e.touches.length !== 1 || !el || e.target.closest('button,textarea')) return tdPressCancel();
    const t = e.touches[0];
    tdPress(el, t.clientX, t.clientY, true);
  },
  { passive: true },
);
lst.addEventListener(
  'touchmove',
  (e) => {
    const t = e.touches[0];
    if (drag) {
      e.preventDefault();
      tdMove(t.clientY);
      return;
    }
    if (hold) {
      if (Math.abs(t.clientX - hold.x) > 8 || Math.abs(t.clientY - hold.y) > 8) tdPressCancel();
      else hold.ly = t.clientY;
    }
  },
  { passive: false },
);
const tdTouchEnd = (e) => {
  if (drag) {
    if (e.cancelable) e.preventDefault();
    tdEnd();
  } else tdPressCancel();
};
lst.addEventListener('touchend', tdTouchEnd);
lst.addEventListener('touchcancel', tdTouchEnd);
lst.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.td')) e.preventDefault();
});
lst.addEventListener('mousedown', (e) => {
  const el = e.target.closest('.td');
  if (e.button !== 0 || !el || e.target.closest('button,textarea')) return;
  tdPress(el, e.clientX, e.clientY, false);
});
document.addEventListener('mousemove', (e) => {
  if (drag) {
    tdMove(e.clientY);
    return;
  }
  if (hold && !hold.touch) {
    if (Math.abs(e.clientX - hold.x) > 5 || Math.abs(e.clientY - hold.y) > 5) tdPressCancel();
    else hold.ly = e.clientY;
  }
});
document.addEventListener('mouseup', () => {
  if (drag) tdEnd();
  else tdPressCancel();
});
