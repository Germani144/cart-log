// Recipes tab: saved dishes, the recipe dialog and adding a dish to the grocery list.
// ---------- dishes: a shared, alphabetical list of saved dishes ----------
// Each dish is stored as {id,name,serves,ingredients,ts}. serves (default 2) and ingredients ([] for now)
// are there for recipes later, so adding them won't need a data migration.
const dishKey = (s) => s.trim().toLocaleLowerCase('da');
function putDish(d) {
  const i = dishes.findIndex((x) => x.id === d.id);
  if (i < 0) dishes.push(d);
  else dishes[i] = d;
  save('cl_dishes', dishes);
  renderDishes();
  put('dishes', d);
}
function removeDish(id) {
  dishes = dishes.filter((x) => x.id !== id);
  save('cl_dishes', dishes);
  renderDishes();
  del('dishes', id);
}
const dishByName = (n, except) => dishes.find((d) => d.id !== except && dishKey(d.name) === dishKey(n));
// the heading of the dish list is a shared, editable title (lists/{code}/meta/dishes)
const DISH_TITLE = "Badger's best dishes";
const dishTitle = () => (meta.dishes && meta.dishes.title) || DISH_TITLE;
function renameDishList() {
  const v = prompt('Name of the dish list', dishTitle());
  if (v == null) return;
  const t = v.trim().replace(/\s+/g, ' ').slice(0, 40) || DISH_TITLE;
  meta.dishes = { id: 'dishes', title: t };
  save('cl_meta', meta);
  renderDishes();
  put('meta', meta.dishes);
}
$('#dsTitle').onclick = renameDishList;
$('#dsTitle').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') renameDishList();
});
function renderDishes() {
  if (!listCode) return;
  $('#dsTitle').textContent = dishTitle();
  const l = [...dishes].sort((a, b) => a.name.localeCompare(b.name, 'da'));
  $('#dsList').innerHTML = l.length
    ? l
        .map(
          (d) =>
            `<div class="ds" data-id="${esc(d.id)}"><div class="tdt" data-de="${esc(d.id)}">${esc(d.name)}<span class="dsub" data-de="${esc(d.id)}">${(d.ingredients || []).length ? `${d.ingredients.length} ingredient${d.ingredients.length > 1 ? 's' : ''} · for ${d.serves || 2}` : 'no recipe yet'}</span></div><button class="x" data-dd="${esc(d.id)}" aria-label="Delete">✕</button></div>`,
        )
        .join('')
    : '<div class="empty">No dishes yet.<br>Add one above, e.g. Lasagne.</div>';
  $('#dsN').textContent = l.length ? ` · ${l.length}` : '';
  $('#dsTip').textContent = l.length ? 'tap for recipe' : '';
  if (typeof packHint === 'function') packHint();
}
$('#dsForm').onsubmit = (e) => {
  e.preventDefault();
  const i = $('#dsNew'),
    name = i.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  const dup = dishByName(name);
  if (dup) {
    $('#dsHint').textContent = `"${dup.name}" is already saved.`;
    setTimeout(() => ($('#dsHint').textContent = ''), 2500);
  } else {
    putDish({ id: uid(), name, serves: 2, ingredients: [], ts: Date.now() });
    i.value = '';
    $('#dsHint').textContent = '';
  }
  i.focus();
};
$('#dsList').addEventListener('click', (e) => {
  const x = e.target.closest('[data-dd]'),
    t = e.target.closest('[data-de]');
  if (x) {
    const d = dishes.find((v) => v.id === x.dataset.dd);
    if (d && confirm(`Delete "${d.name}"?`)) removeDish(d.id);
    return;
  }
  if (t) openDish(t.dataset.de);
});
// ---------- recipe dialog ----------
// ingredients come from the same item database as the grocery list; each stores {cid,da,en,amt,unit}.
// The unit is the database item's standard unit and can't be changed here; only a brand-new ingredient
// (not in the database yet) gets a unit picker, and is then saved to the database under Andet / Other.
let ds = null; // {id,serves,ings:[...]}, edited in the dialog and written on Save
const ROUND_UP = new Set(['pcs', 'pack', 'can', 'bottle', 'bunch']);
function openDish(id) {
  const d = dishes.find((v) => v.id === id);
  if (!d) return;
  ds = { id, serves: d.serves || 2, ings: (d.ingredients || []).map((x) => ({ ...x })) };
  $('#dsName').value = d.name;
  $('#ingNew').value = '';
  $('#ingSug').innerHTML = '';
  drawIngs();
  $('#dsDlg').showModal();
  $('#dsDlg .dt').focus();
  $('#dsDlg').scrollTop = 0;
}
function drawIngs() {
  $('#srvN').textContent = ds.serves;
  $('#ingList').innerHTML = ds.ings
    .map((g, i) => {
      const e = entries()[g.cid],
        da = e ? e.da : g.da,
        en = e ? e.en : g.en;
      const unit = g.isNew
        ? `<select data-iu="${i}" aria-label="Unit">${UNITS.map((u) => `<option${u === g.unit ? ' selected' : ''}>${u}</option>`).join('')}</select>`
        : `<span class="un">${esc(g.unit)}</span>`;
      return `<div class="ing"><div class="nm">${nameHtml(da, en)}</div><input data-ia="${i}" inputmode="decimal" value="${fmt(g.amt)}" aria-label="Amount">${unit}<button class="x" type="button" data-ix="${i}" aria-label="Remove">✕</button></div>`;
    })
    .join('');
  $('#dsToList').disabled = !ds.ings.length;
  $('#dsToList').style.opacity = ds.ings.length ? 1 : 0.5;
}
function ingSuggest() {
  const { rest } = parseQty($('#ingNew').value),
    box = $('#ingSug');
  if (!rest) {
    box.innerHTML = '';
    box.className = '';
    return;
  }
  const have = new Set(ds.ings.map((g) => g.cid));
  const hits = searchEntries(
    Object.values(entries()).filter((e) => !have.has(e.id)),
    rest,
  );
  box.className = 'sugg';
  box.innerHTML =
    hits
      .map(
        ({ e }) =>
          `<div class="sg" data-ic="${esc(e.id)}"><span>${nameHtml(e.da, e.en)}</span><span class="cat">${esc(entryDef(e).unit)}</span></div>`,
      )
      .join('') + (findExact(rest) ? '' : `<div class="sg new" data-inew="1">＋ New ingredient “${esc(rest)}”</div>`);
}
function addIng(e, isNew) {
  const { typed } = parseQty($('#ingNew').value),
    cid = keyOf(e.da);
  const i = ds.ings.findIndex((g) => g.cid === cid);
  if (i < 0) {
    // "500 g mel" when flour is stored in kg -> 0,5 kg (only between compatible units)
    const unit = isNew ? (typed && typed.unit) || 'pcs' : entryDef(e).unit;
    let amt = typed && typed.amt != null ? typed.amt : entryDef(e).amt;
    if (!isNew && typed && typed.unit && typed.amt != null) {
      const c = conv(typed.amt, typed.unit, unit);
      if (c != null) amt = Math.round(c * 1000) / 1000;
    }
    ds.ings.push({ cid, da: e.da, en: e.en || '', amt, unit, ...(isNew ? { isNew: true } : {}) });
  }
  $('#ingNew').value = '';
  ingSuggest();
  drawIngs();
  const inp = document.querySelector(`#ingList [data-ia="${i < 0 ? ds.ings.length - 1 : i}"]`);
  if (inp) {
    inp.focus();
    inp.select();
  }
}
function ingFromText() {
  const { rest } = parseQty($('#ingNew').value);
  if (!rest) return;
  const e = findExact(rest);
  if (e) addIng(e, false);
  else addIng({ da: rest[0].toUpperCase() + rest.slice(1), en: '' }, true);
}
$('#ingNew').addEventListener('input', ingSuggest);
$('#ingNew').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    ingFromText();
  }
});
$('#ingSug').addEventListener('click', (e) => {
  const c = e.target.closest('[data-ic]'),
    n = e.target.closest('[data-inew]');
  if (c) addIng(entries()[c.dataset.ic], false);
  else if (n) ingFromText();
});
$('#ingList').addEventListener('input', (e) => {
  const a = e.target.closest('[data-ia]');
  if (a) ds.ings[a.dataset.ia].amt = parseAmt(a.value);
});
$('#ingList').addEventListener('change', (e) => {
  const a = e.target.closest('[data-ia]'),
    u = e.target.closest('[data-iu]');
  if (a) {
    a.value = fmt(ds.ings[a.dataset.ia].amt);
  }
  if (u) {
    ds.ings[u.dataset.iu].unit = u.value;
  }
});
$('#ingList').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[data-ia]')) {
    e.preventDefault();
    $('#ingNew').focus();
  }
});
$('#ingList').addEventListener('click', (e) => {
  const x = e.target.closest('[data-ix]');
  if (x) {
    ds.ings.splice(+x.dataset.ix, 1);
    drawIngs();
  }
});
$('#srvM').onclick = () => {
  if (ds.serves > 1) {
    ds.serves--;
    drawIngs();
  }
};
$('#srvP').onclick = () => {
  if (ds.serves < 20) {
    ds.serves++;
    drawIngs();
  }
};
// write the dialog back to the dish; new ingredients also go into the shared item database
function dsCommit() {
  const d = dishes.find((v) => v.id === ds.id),
    name = $('#dsName').value.trim().replace(/\s+/g, ' ');
  if (!d) return true;
  if (!name) {
    $('#dsName').focus();
    return false;
  }
  if (dishByName(name, d.id)) {
    alert(`"${name}" is already saved.`);
    return false;
  }
  ds.ings.forEach((g) => {
    if (g.isNew) {
      if (!entries()[g.cid])
        upsertShared({
          id: g.cid,
          da: g.da,
          en: '',
          cat: 'andet',
          amt: g.amt,
          unit: g.unit,
          n: 0,
          at: Date.now(),
        });
      delete g.isNew;
    }
  });
  putDish({
    ...d,
    name,
    serves: ds.serves,
    ingredients: ds.ings.map(({ cid, da, en, amt, unit }) => ({ cid, da, en, amt, unit })),
  });
  return true;
}
function dsSave() {
  if (dsCommit()) $('#dsDlg').close();
}
$('#dsSave').onclick = dsSave;
$('#dsName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    dsSave();
  }
});
$('#dsCancel').onclick = () => $('#dsDlg').close();
$('#dsDel').onclick = () => {
  const d = dishes.find((v) => v.id === ds.id);
  if (d && confirm(`Delete "${d.name}"?`)) removeDish(d.id);
  $('#dsDlg').close();
};

// ---------- add a dish to the grocery list, scaled to N people ----------
const CONV = { g: ['m', 1], kg: ['m', 1000], ml: ['v', 1], dl: ['v', 100], l: ['v', 1000] };
const conv = (a, from, to) =>
  from === to ? a : CONV[from] && CONV[to] && CONV[from][0] === CONV[to][0] ? (a * CONV[from][1]) / CONV[to][1] : null;
const niceAmt = (a, u) =>
  ROUND_UP.has(u)
    ? Math.max(1, Math.ceil(a - 1e-9))
    : u === 'g' || u === 'ml'
      ? Math.max(1, Math.round(a))
      : Math.max(0.1, Math.round(a * 10) / 10);
function scaledIngs(people) {
  return ds.ings.map((g) => ({ ...g, amt: niceAmt((g.amt * people) / ds.serves, g.unit) }));
}
function ppPreview() {
  const n = Math.max(1, Math.min(50, parseInt($('#ppN').value) || 1));
  $('#ppPrev').innerHTML = scaledIngs(n)
    .map((g) => `${fmt(g.amt)} ${esc(g.unit)} ${esc((entries()[g.cid] || g).da)}`)
    .join('<br>');
}
$('#dsToList').onclick = () => {
  if (!ds.ings.length || !dsCommit()) return;
  $('#ppTitle').textContent = `Add ${$('#dsName').value.trim()} to the grocery list`;
  $('#ppN').value = ds.serves;
  ppPreview();
  $('#ppDlg').showModal();
  $('#ppTitle').focus();
};
$('#ppN').addEventListener('input', ppPreview);
$('#ppM').onclick = () => {
  $('#ppN').value = Math.max(1, (parseInt($('#ppN').value) || 1) - 1);
  ppPreview();
};
$('#ppP').onclick = () => {
  $('#ppN').value = Math.min(50, (parseInt($('#ppN').value) || 0) + 1);
  ppPreview();
};
$('#ppCancel').onclick = () => $('#ppDlg').close();
$('#ppGo').onclick = () => {
  const n = Math.max(1, Math.min(50, parseInt($('#ppN').value) || 1));
  let added = 0,
    merged = 0,
    kept = [];
  for (const g of scaledIngs(n)) {
    const e = entries()[g.cid] || { da: g.da, en: g.en, cat: 'andet', amt: g.amt, unit: g.unit };
    const on = items.find((i) => !i.done && itemCid(i) === g.cid);
    if (!on) {
      addToList(e, { amt: g.amt, unit: g.unit }, false);
      added++;
      continue;
    }
    // already on the list: add to its amount when the units can be combined (g↔kg, ml↔dl↔l)
    const q = itemQty(on),
      c = conv(g.amt, g.unit, q.unit);
    if (c == null) {
      kept.push(e.da);
      continue;
    }
    putItem(withQty(on, Math.round((q.amt + c) * 100) / 100, q.unit));
    merged++;
  }
  $('#ppDlg').close();
  $('#dsDlg').close();
  $('#dsHint').textContent =
    `${$('#dsName').value.trim()} for ${n}: ${added} added` +
    (merged ? `, ${merged} topped up` : '') +
    (kept.length ? `, already on the list in another unit: ${kept.join(', ')}` : '') +
    '.';
  setTimeout(() => ($('#dsHint').textContent = ''), 6000);
};
