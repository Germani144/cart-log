// Groceries tab: adding items, the item dialog (new/edit, categories), the list itself and the item manager.
// ---------- add flow ----------
// the database entry whose Danish or English name is exactly the typed text
const findKnownItem = (t) => findExactEntry(Object.values(itemDatabase()), t);
function submitNewItem() {
  const { typed, rest } = parseQuantity($('#newItem').value.trim());
  if (!rest) return;
  const e = findKnownItem(rest);
  $('#newItem').value = '';
  // unknown items go straight onto the list under Andet/Other; tap the item later to set category, English name and standard amount
  if (e) addToGroceryList(e, typed, false);
  else addToGroceryList({ da: rest[0].toUpperCase() + rest.slice(1), en: '', cat: 'andet' }, typed, true);
  showSuggestions();
}
const nameHtml = (da, en) =>
  `<b class="da">${esc(da)}</b>` +
  (en && anyEqual(searchForms(en), searchForms(da)) === false ? `<span class="en">${esc(en)}</span>` : '');
const categoryLabel = (id) => {
  const c = categoryInfo(id);
  return esc(c.da) + (c.en && c.en !== c.da ? ` · ${esc(c.en)}` : '');
};
function showSuggestions() {
  const raw = $('#newItem').value.trim(),
    { rest } = parseQuantity(raw),
    box = $('#chips');
  const onList = new Set(items.filter((i) => !i.done).map(itemId));
  let c = Object.values(itemDatabase()).filter((e) => !onList.has(e.id));
  if (!rest) {
    c = c.filter((e) => e.n > 0).sort((a, b) => b.n - a.n || b.at - a.at);
    box.className = 'chips';
    box.innerHTML = c
      .slice(0, 8)
      .map((e) => `<button class="chip" type="button" data-c="${esc(e.id)}">${nameHtml(e.da, e.en)}</button>`)
      .join('');
    return;
  }
  const scored = rankEntries(c, rest, categoryInfo);
  box.className = 'sugg';
  box.innerHTML =
    scored
      .map(
        ({ e }) =>
          `<div class="sg" data-c="${esc(e.id)}"><span>${nameHtml(e.da, e.en)}</span><span class="cat">${esc(categoryInfo(e.cat).da)}</span></div>`,
      )
      .join('') + (findKnownItem(rest) ? '' : `<div class="sg new" data-new="1">＋ Add “${esc(rest)}”</div>`);
}

// ---------- item dialog (new + edit) ----------
function openItemDialog(s) {
  itemDialog = {
    mode: s.mode,
    id: s.id || null,
    sel: s.cat || '',
    newCat: null,
    unit: s.unit || 'pcs',
    catColor: s.cat && customCategories[s.cat] ? safeColor(customCategories[s.cat].color) : null,
    colorTouched: false,
  };
  $('#cdDa').value = s.da || '';
  $('#cdEn').value = s.en || '';
  $('#cdAmt').value = formatAmount(s.amt ?? 1);
  $('#cdNewDa').value = '';
  $('#cdNewEn').value = '';
  $('#cdHint').textContent = '';
  $('#cdTitle').textContent = s.mode === 'new' ? 'New item' : 'Edit item';
  $('#cdDel').hidden = s.mode !== 'edit';
  // forgetting only makes sense for items you added yourself; built-in items always stay in the database
  const own = s.mode === 'edit' && !builtInItems[itemKey(s.da || '')];
  $('#cdForget').hidden = !own;
  $('#cdForgetHint').hidden = !own;
  drawCategoryChips();
  drawUnitChips();
  $('#catDlg').showModal();
}
function drawCategoryChips() {
  $('#cdCats').innerHTML = allCategories()
    .map(
      (c) =>
        `<button type="button" class="chip${c.id === itemDialog.sel ? ' sel' : ''}" data-cc="${esc(c.id)}" style="--c:${safeColor(c.color)}"><span class="cd"></span>${nameHtml(c.da, c.en)}</button>`,
    )
    .join('');
  $('#cdSave').disabled = !itemDialog.sel || !($('#cdDa').value.trim() || $('#cdEn').value.trim());
  drawColorChoices();
}
// color choice appears when creating a category, or when the selected category is one of your own
function drawCategoryPreview() {
  const st = itemDialog,
    nm = st.newCat || customCategories[st.sel];
  if (!nm) return;
  const cur = safeColor(st.catColor);
  $('#cdPrev').setAttribute('style', `--c:${cur};--t:${textColorOn(cur)};margin-top:10px;border-radius:10px`);
  $('#cdPrev').innerHTML = `<b>${esc(nm.da)}</b>${nm.en ? `<span class="en">${esc(nm.en)}</span>` : ''}`;
}
function drawColorChoices() {
  const st = itemDialog,
    custom = st.newCat || (st.sel && customCategories[st.sel]);
  $('#cdColorWrap').hidden = !custom;
  if (!custom) return;
  const cur = safeColor(st.catColor).toLowerCase();
  $('#cdColors').innerHTML =
    PALETTE.map(
      (c) =>
        `<button type="button" class="swb${c.toLowerCase() === cur ? ' sel' : ''}" data-sw="${c}" style="background:${c}" aria-label="Color ${c}"></button>`,
    ).join('') + `<input type="color" id="cdColorPick" value="${cur}" aria-label="Pick any color">`;
  drawCategoryPreview();
}
$('#cdColors').addEventListener('input', (e) => {
  if (e.target.id === 'cdColorPick') {
    itemDialog.catColor = e.target.value;
    itemDialog.colorTouched = true;
    drawCategoryPreview();
  }
});
$('#cdColors').addEventListener('change', (e) => {
  if (e.target.id === 'cdColorPick') drawColorChoices();
});
function drawUnitChips() {
  $('#cdUnits').innerHTML = UNITS.map(
    (u) => `<button type="button" class="chip${u === itemDialog.unit ? ' sel' : ''}" data-un="${u}">${u}</button>`,
  ).join('');
}
function updateNewCategory() {
  const da = $('#cdNewDa').value.trim(),
    en = $('#cdNewEn').value.trim();
  if (!da) {
    if (itemDialog.newCat) itemDialog.sel = '';
    itemDialog.newCat = null;
    if (!customCategories[itemDialog.sel]) itemDialog.catColor = null;
    $('#cdHint').textContent = '';
    drawCategoryChips();
    return;
  }
  const hit = findExactEntry(allCategories(), da);
  if (hit) {
    itemDialog.sel = hit.id;
    itemDialog.newCat = null;
    itemDialog.catColor = customCategories[hit.id] ? safeColor(customCategories[hit.id].color) : null;
    $('#cdHint').textContent = `Using existing category “${hit.da}”`;
  } else {
    const id = 'c_' + itemKey(da);
    itemDialog.newCat = { id, da, en };
    itemDialog.sel = id;
    if (!itemDialog.colorTouched || !itemDialog.catColor) itemDialog.catColor = colorForName(da, PALETTE);
    $('#cdHint').textContent = `Will create category “${da}”`;
  }
  drawCategoryChips();
}
$('#cdNewDa').oninput = updateNewCategory;
$('#cdNewEn').oninput = updateNewCategory;
$('#cdDa').oninput = drawCategoryChips;
$('#cdEn').oninput = drawCategoryChips;
$('#qPlus').onclick = () => {
  $('#cdAmt').value = formatAmount(stepAmount(parseAmount($('#cdAmt').value), itemDialog.unit, 1));
};
$('#qMinus').onclick = () => {
  $('#cdAmt').value = formatAmount(stepAmount(parseAmount($('#cdAmt').value), itemDialog.unit, -1));
};
$('#cdSave').onclick = () => {
  let da = $('#cdDa').value.trim(),
    en = $('#cdEn').value.trim();
  const amt = parseAmount($('#cdAmt').value),
    unit = itemDialog.unit,
    cat = itemDialog.sel;
  if (!da) {
    da = en;
    en = '';
  }
  if (!da || !cat) return;
  if (itemDialog.newCat) saveCategory({ ...itemDialog.newCat, color: safeColor(itemDialog.catColor) });
  else if (
    customCategories[cat] &&
    itemDialog.catColor &&
    safeColor(itemDialog.catColor) !== safeColor(customCategories[cat].color)
  )
    saveCategory({ ...customCategories[cat], color: safeColor(itemDialog.catColor) });
  if (itemDialog.mode === 'new') addToGroceryList({ da, en, cat }, { amt, unit }, true);
  else {
    const it = items.find((x) => x.id === itemDialog.id);
    if (it) {
      const cid = itemKey(da),
        prev = catalog[cid];
      saveItem(withAmount({ ...it, cid, da, en, cat }, amt, unit));
      saveCatalogEntry({ id: cid, da, en, cat, amt, unit, n: prev ? prev.n : 1, at: Date.now() });
    }
  }
  $('#catDlg').close();
  showSuggestions();
};
$('#cdCancel').onclick = () => $('#catDlg').close();
$('#cdDel').onclick = () => {
  removeItem(itemDialog.id);
  $('#catDlg').close();
};
$('#cdForget').onclick = () => {
  const it = items.find((x) => x.id === itemDialog.id);
  if (!it) return $('#catDlg').close();
  const cid = itemId(it);
  items.filter((x) => itemId(x) === cid).forEach((x) => removeItem(x.id));
  if (catalog[cid]) deleteCatalogEntry(cid);
  $('#catDlg').close();
  showSuggestions();
};

// ---------- list UI ----------
function itemRowHtml(it) {
  const { amt, unit } = itemQuantity(it);
  const ctl = it.done
    ? `<span class="ql">${formatAmount(amt)} ${esc(unit)}</span>`
    : `<div class="step"><button class="sb" data-qm="${esc(it.id)}" aria-label="Less">−</button><button class="qv" data-e="${esc(it.id)}" aria-label="Edit amount"><b>${formatAmount(amt)}</b><small>${esc(unit)}</small></button><button class="sb" data-qp="${esc(it.id)}" aria-label="More">+</button></div>`;
  return `<div class="item ${it.done ? 'done' : ''}" style="${categoryStyle(it.cat || 'andet')}">
    <button class="chk" data-t="${esc(it.id)}" aria-label="Toggle">${it.done ? '✓' : ''}</button>
    <div class="txt" data-e="${esc(it.id)}">${nameHtml(itemName(it), it.en)}</div>
    ${ctl}
    <button class="x" data-d="${esc(it.id)}" aria-label="Delete">✕</button></div>`;
}
function groupByCategory(list) {
  const m = {};
  list.forEach((i) => (m[i.cat || 'andet'] ??= []).push(i));
  return Object.keys(m)
    .sort((a, b) => categoryRank(a) - categoryRank(b) || categoryInfo(a).da.localeCompare(categoryInfo(b).da, 'da'))
    .map((c) => [c, m[c].sort((a, b) => a.ts - b.ts)]);
}
function render() {
  if (!listCode) {
    $('#setup').hidden = false;
    $('#main').hidden = true;
    $('#cfgWarn').hidden = firebaseConfigured();
    return;
  }
  $('#setup').hidden = true;
  $('#main').hidden = false;
  const todo = items.filter((i) => !i.done),
    done = items.filter((i) => i.done).sort((a, b) => b.ts - a.ts);
  $('#todo').innerHTML = todo.length
    ? groupByCategory(todo)
        .map(([c, l]) => {
          const ci = categoryInfo(c);
          return `<div style="${categoryStyle(c)}"><div class="gh"><b>${esc(ci.da)}</b>${ci.en && ci.en !== ci.da ? `<span class="en">${esc(ci.en)}</span>` : ''} · ${l.length}${c === 'andet' ? '<span class="ghh">tap an item to set it up</span>' : ''}</div>${l.map(itemRowHtml).join('')}</div>`;
        })
        .join('')
    : '<div class="empty">Nothing to buy 🎉<br>Add something above.</div>';
  $('#todoH').textContent = 'To buy' + (todo.length ? ` · ${todo.length}` : '');
  $('#doneHead').hidden = $('#done').hidden = !done.length;
  $('#done').innerHTML = done.map(itemRowHtml).join('');
  $('#doneH').textContent = `In the cart · ${done.length}`;
  showSuggestions();
  $('#cntG').textContent = todo.length || '';
  renderTodos();
  renderDishes();
}
function drawManager() {
  const s = Object.values(catalog).sort(
    (a, b) => categoryRank(a.cat) - categoryRank(b.cat) || a.da.localeCompare(b.da, 'da'),
  );
  const c = Object.values(customCategories).sort((a, b) => a.da.localeCompare(b.da, 'da'));
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
              `<div class="mrow"><div>${nameHtml(e.da, e.en)}<div class="mu">${categoryLabel(e.cat)}</div></div><button class="x" data-md="${esc(e.id)}" aria-label="Remove">✕</button></div>`,
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
    if (it) saveItem({ ...it, done: !it.done, ts: Date.now() });
  } else if (D.qp || D.qm) {
    const it = items.find((x) => x.id === (D.qp || D.qm));
    if (it) stepItemAmount(it, D.qp ? 1 : -1);
  } else if (D.d) {
    removeItem(D.d);
  } else if (D.e) {
    const it = items.find((x) => x.id === D.e);
    if (it) {
      const q = itemQuantity(it);
      openItemDialog({
        mode: 'edit',
        id: it.id,
        da: itemName(it),
        en: it.en || '',
        amt: q.amt,
        unit: q.unit,
        cat: it.cat || '',
      });
    }
  } else if (D.un) {
    itemDialog.unit = D.un;
    drawUnitChips();
  } else if (D.c) {
    const en = itemDatabase()[D.c];
    if (en) {
      addToGroceryList(en, parseQuantity($('#newItem').value.trim()).typed, false);
      $('#newItem').value = '';
      showSuggestions();
    }
  } else if (D.new !== undefined) {
    submitNewItem();
  } else if (D.cc !== undefined) {
    itemDialog.sel = D.cc;
    itemDialog.newCat = null;
    itemDialog.colorTouched = false;
    itemDialog.catColor = customCategories[D.cc] ? safeColor(customCategories[D.cc].color) : null;
    $('#cdNewDa').value = '';
    $('#cdNewEn').value = '';
    $('#cdHint').textContent = '';
    drawCategoryChips();
  } else if (D.sw) {
    itemDialog.catColor = D.sw;
    itemDialog.colorTouched = true;
    drawColorChoices();
  } else if (D.xt) {
    if (Date.now() < ignoreTapsUntil) return;
    const t = todoById(D.xt);
    if (t) saveTodo({ ...t, done: !t.done, ts: Date.now() });
  } else if (D.xd) {
    if (Date.now() < ignoreTapsUntil) return;
    const t = todoById(D.xd);
    if (t && t.head && !confirm(`Delete the heading "${t.text}"? Its to-dos stay in the list.`)) return;
    removeTodo(D.xd);
  } else if (D.xe) {
    if (Date.now() < ignoreTapsUntil) return;
    editTodoText(D.xe);
  } else if (D.md) {
    deleteCatalogEntry(D.md);
    drawManager();
    render();
  } else if (D.mc) {
    deleteCategory(D.mc);
    drawManager();
    render();
  }
});
$('#addForm').onsubmit = (e) => {
  e.preventDefault();
  submitNewItem();
  $('#newItem').focus();
};
$('#newItem').oninput = showSuggestions;
$('#clearDone').onclick = () => {
  const d = items.filter((i) => i.done);
  if (d.length && confirm(`Remove ${d.length} item${d.length > 1 ? 's' : ''} from the cart?`))
    d.forEach((i) => removeItem(i.id));
};
