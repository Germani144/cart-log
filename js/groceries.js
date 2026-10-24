// Groceries tab: adding items, the item dialog (new/edit, categories), the list itself and the item manager.
// ---------- add flow ----------
const QTY =
  /^(\d+(?:[.,]\d+)?)\s*(x|stk|pcs|g|kg|ml|dl|l|liter|pk|pak|pakke|pakker|pack|packs|can|cans|dåse|dåser|fl|flaske|flasker|bottle|bottles|bdt|bunch|bundt)?\s+(\S.*)$/i;
function parseQty(t) {
  const m = QTY.exec(t.trim());
  return m
    ? { typed: { amt: parseAmt(m[1]), unit: unitOf(m[2]) }, rest: m[3].trim() }
    : { typed: null, rest: t.trim() };
}
function findExact(t) {
  const f = forms(t);
  return Object.values(entries()).find((e) => eqAny(forms(e.da), f) || (e.en && eqAny(forms(e.en), f)));
}
function submitInput() {
  const { typed, rest } = parseQty($('#newItem').value.trim());
  if (!rest) return;
  const e = findExact(rest);
  $('#newItem').value = '';
  // unknown items go straight onto the list under Andet/Other; tap the item later to set category, English name and standard amount
  if (e) addToList(e, typed, false);
  else addToList({ da: rest[0].toUpperCase() + rest.slice(1), en: '', cat: 'andet' }, typed, true);
  suggest();
}
const nameHtml = (da, en) =>
  `<b class="da">${esc(da)}</b>` +
  (en && eqAny(forms(en), forms(da)) === false ? `<span class="en">${esc(en)}</span>` : '');
const catName = (id) => {
  const c = catInfo(id);
  return esc(c.da) + (c.en && c.en !== c.da ? ` · ${esc(c.en)}` : '');
};
// best matches for typed text among database entries: name starts with it, then contains it, then its category does
function searchEntries(c, rest) {
  const q = forms(rest);
  return c
    .map((e) => {
      const nf = [...forms(e.da), ...forms(e.en)],
        cf = ((ci) => [...forms(ci.da), ...forms(ci.en || '')])(catInfo(e.cat));
      const tier = startsAny(nf, q) ? 0 : hasAny(nf, q) ? 1 : hasAny(cf, q) ? 2 : 9;
      return { e, tier };
    })
    .filter((x) => x.tier < 9)
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        (b.e.n || 0) - (a.e.n || 0) ||
        a.e.da.length - b.e.da.length ||
        a.e.da.localeCompare(b.e.da, 'da'),
    )
    .slice(0, 8);
}
function suggest() {
  const raw = $('#newItem').value.trim(),
    { rest } = parseQty(raw),
    box = $('#chips');
  const onList = new Set(items.filter((i) => !i.done).map(itemCid));
  let c = Object.values(entries()).filter((e) => !onList.has(e.id));
  if (!rest) {
    c = c.filter((e) => e.n > 0).sort((a, b) => b.n - a.n || b.at - a.at);
    box.className = 'chips';
    box.innerHTML = c
      .slice(0, 8)
      .map((e) => `<button class="chip" type="button" data-c="${esc(e.id)}">${nameHtml(e.da, e.en)}</button>`)
      .join('');
    return;
  }
  const scored = searchEntries(c, rest);
  box.className = 'sugg';
  box.innerHTML =
    scored
      .map(
        ({ e }) =>
          `<div class="sg" data-c="${esc(e.id)}"><span>${nameHtml(e.da, e.en)}</span><span class="cat">${esc(catInfo(e.cat).da)}</span></div>`,
      )
      .join('') + (findExact(rest) ? '' : `<div class="sg new" data-new="1">＋ Add “${esc(rest)}”</div>`);
}

// ---------- item dialog (new + edit) ----------
function openDlg(s) {
  dlgState = {
    mode: s.mode,
    id: s.id || null,
    sel: s.cat || '',
    newCat: null,
    unit: s.unit || 'pcs',
    catColor: s.cat && customCats[s.cat] ? safeColor(customCats[s.cat].color) : null,
    colorTouched: false,
  };
  $('#cdDa').value = s.da || '';
  $('#cdEn').value = s.en || '';
  $('#cdAmt').value = fmt(s.amt ?? 1);
  $('#cdNewDa').value = '';
  $('#cdNewEn').value = '';
  $('#cdHint').textContent = '';
  $('#cdTitle').textContent = s.mode === 'new' ? 'New item' : 'Edit item';
  $('#cdDel').hidden = s.mode !== 'edit';
  // forgetting only makes sense for items you added yourself; built-in items always stay in the database
  const own = s.mode === 'edit' && !seedItems[keyOf(s.da || '')];
  $('#cdForget').hidden = !own;
  $('#cdForgetHint').hidden = !own;
  drawCats();
  drawUnits();
  $('#catDlg').showModal();
}
function drawCats() {
  $('#cdCats').innerHTML = allCats()
    .map(
      (c) =>
        `<button type="button" class="chip${c.id === dlgState.sel ? ' sel' : ''}" data-cc="${esc(c.id)}" style="--c:${safeColor(c.color)}"><span class="cd"></span>${nameHtml(c.da, c.en)}</button>`,
    )
    .join('');
  $('#cdSave').disabled = !dlgState.sel || !($('#cdDa').value.trim() || $('#cdEn').value.trim());
  drawColors();
}
// color choice appears when creating a category, or when the selected category is one of your own
function drawPrev() {
  const st = dlgState,
    nm = st.newCat || customCats[st.sel];
  if (!nm) return;
  const cur = safeColor(st.catColor);
  $('#cdPrev').setAttribute('style', `--c:${cur};--t:${textOn(cur)};margin-top:10px;border-radius:10px`);
  $('#cdPrev').innerHTML = `<b>${esc(nm.da)}</b>${nm.en ? `<span class="en">${esc(nm.en)}</span>` : ''}`;
}
function drawColors() {
  const st = dlgState,
    custom = st.newCat || (st.sel && customCats[st.sel]);
  $('#cdColorWrap').hidden = !custom;
  if (!custom) return;
  const cur = safeColor(st.catColor).toLowerCase();
  $('#cdColors').innerHTML =
    PALETTE.map(
      (c) =>
        `<button type="button" class="swb${c.toLowerCase() === cur ? ' sel' : ''}" data-sw="${c}" style="background:${c}" aria-label="Color ${c}"></button>`,
    ).join('') + `<input type="color" id="cdColorPick" value="${cur}" aria-label="Pick any color">`;
  drawPrev();
}
$('#cdColors').addEventListener('input', (e) => {
  if (e.target.id === 'cdColorPick') {
    dlgState.catColor = e.target.value;
    dlgState.colorTouched = true;
    drawPrev();
  }
});
$('#cdColors').addEventListener('change', (e) => {
  if (e.target.id === 'cdColorPick') drawColors();
});
function drawUnits() {
  $('#cdUnits').innerHTML = UNITS.map(
    (u) => `<button type="button" class="chip${u === dlgState.unit ? ' sel' : ''}" data-un="${u}">${u}</button>`,
  ).join('');
}
function updateNewCat() {
  const da = $('#cdNewDa').value.trim(),
    en = $('#cdNewEn').value.trim();
  if (!da) {
    if (dlgState.newCat) dlgState.sel = '';
    dlgState.newCat = null;
    if (!customCats[dlgState.sel]) dlgState.catColor = null;
    $('#cdHint').textContent = '';
    drawCats();
    return;
  }
  const f = forms(da),
    hit = allCats().find((c) => eqAny(forms(c.da), f) || (c.en && eqAny(forms(c.en), f)));
  if (hit) {
    dlgState.sel = hit.id;
    dlgState.newCat = null;
    dlgState.catColor = customCats[hit.id] ? safeColor(customCats[hit.id].color) : null;
    $('#cdHint').textContent = `Using existing category “${hit.da}”`;
  } else {
    const id = 'c_' + keyOf(da);
    dlgState.newCat = { id, da, en };
    dlgState.sel = id;
    if (!dlgState.colorTouched || !dlgState.catColor) dlgState.catColor = hashColor(da);
    $('#cdHint').textContent = `Will create category “${da}”`;
  }
  drawCats();
}
$('#cdNewDa').oninput = updateNewCat;
$('#cdNewEn').oninput = updateNewCat;
$('#cdDa').oninput = drawCats;
$('#cdEn').oninput = drawCats;
$('#qPlus').onclick = () => {
  $('#cdAmt').value = fmt(stepVal(parseAmt($('#cdAmt').value), dlgState.unit, 1));
};
$('#qMinus').onclick = () => {
  $('#cdAmt').value = fmt(stepVal(parseAmt($('#cdAmt').value), dlgState.unit, -1));
};
$('#cdSave').onclick = () => {
  let da = $('#cdDa').value.trim(),
    en = $('#cdEn').value.trim();
  const amt = parseAmt($('#cdAmt').value),
    unit = dlgState.unit,
    cat = dlgState.sel;
  if (!da) {
    da = en;
    en = '';
  }
  if (!da || !cat) return;
  if (dlgState.newCat) upsertCat({ ...dlgState.newCat, color: safeColor(dlgState.catColor) });
  else if (customCats[cat] && dlgState.catColor && safeColor(dlgState.catColor) !== safeColor(customCats[cat].color))
    upsertCat({ ...customCats[cat], color: safeColor(dlgState.catColor) });
  if (dlgState.mode === 'new') addToList({ da, en, cat }, { amt, unit }, true);
  else {
    const it = items.find((x) => x.id === dlgState.id);
    if (it) {
      const cid = keyOf(da),
        prev = shared[cid];
      putItem(withQty({ ...it, cid, da, en, cat }, amt, unit));
      upsertShared({ id: cid, da, en, cat, amt, unit, n: prev ? prev.n : 1, at: Date.now() });
    }
  }
  $('#catDlg').close();
  suggest();
};
$('#cdCancel').onclick = () => $('#catDlg').close();
$('#cdDel').onclick = () => {
  removeItem(dlgState.id);
  $('#catDlg').close();
};
$('#cdForget').onclick = () => {
  const it = items.find((x) => x.id === dlgState.id);
  if (!it) return $('#catDlg').close();
  const cid = itemCid(it);
  items.filter((x) => itemCid(x) === cid).forEach((x) => removeItem(x.id));
  if (shared[cid]) delShared(cid);
  $('#catDlg').close();
  suggest();
};

// ---------- list UI ----------
function row(it) {
  const { amt, unit } = itemQty(it);
  const ctl = it.done
    ? `<span class="ql">${fmt(amt)} ${esc(unit)}</span>`
    : `<div class="step"><button class="sb" data-qm="${esc(it.id)}" aria-label="Less">−</button><button class="qv" data-e="${esc(it.id)}" aria-label="Edit amount"><b>${fmt(amt)}</b><small>${esc(unit)}</small></button><button class="sb" data-qp="${esc(it.id)}" aria-label="More">+</button></div>`;
  return `<div class="item ${it.done ? 'done' : ''}" style="${catStyle(it.cat || 'andet')}">
    <button class="chk" data-t="${esc(it.id)}" aria-label="Toggle">${it.done ? '✓' : ''}</button>
    <div class="txt" data-e="${esc(it.id)}">${nameHtml(itemDa(it), it.en)}</div>
    ${ctl}
    <button class="x" data-d="${esc(it.id)}" aria-label="Delete">✕</button></div>`;
}
function groups(list) {
  const m = {};
  list.forEach((i) => (m[i.cat || 'andet'] ??= []).push(i));
  return Object.keys(m)
    .sort((a, b) => catRank(a) - catRank(b) || catInfo(a).da.localeCompare(catInfo(b).da, 'da'))
    .map((c) => [c, m[c].sort((a, b) => a.ts - b.ts)]);
}
function render() {
  if (!listCode) {
    $('#setup').hidden = false;
    $('#main').hidden = true;
    $('#cfgWarn').hidden = hasCfg();
    return;
  }
  $('#setup').hidden = true;
  $('#main').hidden = false;
  const todo = items.filter((i) => !i.done),
    done = items.filter((i) => i.done).sort((a, b) => b.ts - a.ts);
  $('#todo').innerHTML = todo.length
    ? groups(todo)
        .map(([c, l]) => {
          const ci = catInfo(c);
          return `<div style="${catStyle(c)}"><div class="gh"><b>${esc(ci.da)}</b>${ci.en && ci.en !== ci.da ? `<span class="en">${esc(ci.en)}</span>` : ''} · ${l.length}${c === 'andet' ? '<span class="ghh">tap an item to set it up</span>' : ''}</div>${l.map(row).join('')}</div>`;
        })
        .join('')
    : '<div class="empty">Nothing to buy 🎉<br>Add something above.</div>';
  $('#todoH').textContent = 'To buy' + (todo.length ? ` · ${todo.length}` : '');
  $('#doneHead').hidden = $('#done').hidden = !done.length;
  $('#done').innerHTML = done.map(row).join('');
  $('#doneH').textContent = `In the cart · ${done.length}`;
  suggest();
  $('#cntG').textContent = todo.length || '';
  renderTodos();
  renderDishes();
}
function drawMgr() {
  const s = Object.values(shared).sort((a, b) => catRank(a.cat) - catRank(b.cat) || a.da.localeCompare(b.da, 'da'));
  const c = Object.values(customCats).sort((a, b) => a.da.localeCompare(b.da, 'da'));
  $('#mgrList').innerHTML =
    `<div class="mh">Categories you created</div>` +
    (c.length
      ? c
          .map(
            (x) =>
              `<div class="mrow" style="--c:${safeColor(x.color)}"><div><span class="cd"></span>${nameHtml(x.da, x.en)}</div><button class="x" data-mc="${esc(x.id)}" aria-label="Remove">✕</button></div>`,
          )
          .join('')
      : '<div class="mu">None yet.</div>') +
    `<div class="mh">Items</div>` +
    (s.length
      ? s
          .map(
            (e) =>
              `<div class="mrow"><div>${nameHtml(e.da, e.en)}<div class="mu">${catName(e.cat)}</div></div><button class="x" data-md="${esc(e.id)}" aria-label="Remove">✕</button></div>`,
          )
          .join('')
      : '<div class="mu">None yet.</div>');
}

document.addEventListener('click', (e) => {
  const t = e.target.closest(
    '[data-t],[data-d],[data-e],[data-c],[data-new],[data-cc],[data-md],[data-mc],[data-qm],[data-qp],[data-un],[data-sw],[data-xt],[data-xd],[data-xe]',
  );
  if (!t) return;
  const D = t.dataset;
  if (D.t) {
    const it = items.find((x) => x.id === D.t);
    if (it) putItem({ ...it, done: !it.done, ts: Date.now() });
  } else if (D.qp || D.qm) {
    const it = items.find((x) => x.id === (D.qp || D.qm));
    if (it) stepQty(it, D.qp ? 1 : -1);
  } else if (D.d) {
    removeItem(D.d);
  } else if (D.e) {
    const it = items.find((x) => x.id === D.e);
    if (it) {
      const q = itemQty(it);
      openDlg({
        mode: 'edit',
        id: it.id,
        da: itemDa(it),
        en: it.en || '',
        amt: q.amt,
        unit: q.unit,
        cat: it.cat || '',
      });
    }
  } else if (D.un) {
    dlgState.unit = D.un;
    drawUnits();
  } else if (D.c) {
    const en = entries()[D.c];
    if (en) {
      addToList(en, parseQty($('#newItem').value.trim()).typed, false);
      $('#newItem').value = '';
      suggest();
    }
  } else if (D.new !== undefined) {
    submitInput();
  } else if (D.cc !== undefined) {
    dlgState.sel = D.cc;
    dlgState.newCat = null;
    dlgState.colorTouched = false;
    dlgState.catColor = customCats[D.cc] ? safeColor(customCats[D.cc].color) : null;
    $('#cdNewDa').value = '';
    $('#cdNewEn').value = '';
    $('#cdHint').textContent = '';
    drawCats();
  } else if (D.sw) {
    dlgState.catColor = D.sw;
    dlgState.colorTouched = true;
    drawColors();
  } else if (D.xt) {
    if (Date.now() < suppressClickUntil) return;
    const t = todoById(D.xt);
    if (t) putTodo({ ...t, done: !t.done, ts: Date.now() });
  } else if (D.xd) {
    if (Date.now() < suppressClickUntil) return;
    const t = todoById(D.xd);
    if (t && t.head && !confirm(`Delete the heading "${t.text}"? Its to-dos stay in the list.`)) return;
    removeTodo(D.xd);
  } else if (D.xe) {
    if (Date.now() < suppressClickUntil) return;
    tdEdit(D.xe);
  } else if (D.md) {
    delShared(D.md);
    drawMgr();
    render();
  } else if (D.mc) {
    delCat(D.mc);
    drawMgr();
    render();
  }
});
$('#addForm').onsubmit = (e) => {
  e.preventDefault();
  submitInput();
  $('#newItem').focus();
};
$('#newItem').oninput = suggest;
$('#clearDone').onclick = () => {
  const d = items.filter((i) => i.done);
  if (d.length && confirm(`Remove ${d.length} item${d.length > 1 ? 's' : ''} from the cart?`))
    d.forEach((i) => removeItem(i.id));
};
