// Recipes tab: saved dishes, the recipe dialog and adding a dish to the grocery list.
// ---------- dishes: a shared, alphabetical list of saved dishes ----------
// Each dish is stored as {id, name, serves, ingredients: [{cid, da, en, amt, unit}], ts}; serves defaults to 2.
function saveDish(d) {
  const i = dishes.findIndex((x) => x.id === d.id);
  if (i < 0) dishes.push(d);
  else dishes[i] = d;
  save('cl_dishes', dishes);
  renderDishes();
  writeShared('dishes', d);
}
function removeDish(id) {
  dishes = dishes.filter((x) => x.id !== id);
  save('cl_dishes', dishes);
  renderDishes();
  deleteShared('dishes', id);
}
const findDishByName = (n, except) => dishes.find((d) => d.id !== except && dishNameKey(d.name) === dishNameKey(n));
// the heading of the dish list is a shared, editable title (lists/{code}/meta/dishes)
const DEFAULT_DISH_LIST_TITLE = "Badger's best dishes";
const dishListTitle = () => (listMeta.dishes && listMeta.dishes.title) || DEFAULT_DISH_LIST_TITLE;
function renameDishList() {
  const v = prompt('Name of the dish list', dishListTitle());
  if (v == null) return;
  const t = v.trim().replace(/\s+/g, ' ').slice(0, 40) || DEFAULT_DISH_LIST_TITLE;
  listMeta.dishes = { id: 'dishes', title: t };
  save('cl_meta', listMeta);
  renderDishes();
  writeShared('meta', listMeta.dishes);
}
$('#dsTitle').onclick = renameDishList;
$('#dsTitle').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') renameDishList();
});
function renderDishes() {
  if (!listCode) return;
  $('#dsTitle').textContent = dishListTitle();
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
  if (typeof updateStarterButton === 'function') updateStarterButton();
}
$('#dsForm').onsubmit = (e) => {
  e.preventDefault();
  const i = $('#dsNew'),
    name = i.value.trim().replace(/\s+/g, ' ');
  if (!name) return;
  const dup = findDishByName(name);
  if (dup) {
    $('#dsHint').textContent = `"${dup.name}" is already saved.`;
    setTimeout(() => ($('#dsHint').textContent = ''), 2500);
  } else {
    saveDish({ id: newId(), name, serves: 2, ingredients: [], ts: Date.now() });
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
  if (t) openRecipe(t.dataset.de);
});
// ---------- recipe dialog ----------
// ingredients come from the same item database as the grocery list; each stores {cid,da,en,amt,unit}.
// The unit is the database item's standard unit and can't be changed here; only a brand-new ingredient
// (not in the database yet) gets a unit picker, and is then saved to the database under Andet / Other.
let recipeDraft = null; // {id,serves,ings:[...]}, edited in the dialog and written on Save
function openRecipe(id) {
  const d = dishes.find((v) => v.id === id);
  if (!d) return;
  recipeDraft = { id, serves: d.serves || 2, ings: (d.ingredients || []).map((x) => ({ ...x })) };
  $('#dsName').value = d.name;
  $('#ingNew').value = '';
  $('#ingSug').innerHTML = '';
  drawIngredients();
  $('#dsDlg').showModal();
  $('#dsDlg .dt').focus();
  $('#dsDlg').scrollTop = 0;
}
function drawIngredients() {
  $('#srvN').textContent = recipeDraft.serves;
  $('#ingList').innerHTML = recipeDraft.ings
    .map((g, i) => {
      const e = itemDatabase()[g.cid],
        da = e ? e.da : g.da,
        en = e ? e.en : g.en;
      const unit = g.isNew
        ? `<select data-iu="${i}" aria-label="Unit">${UNITS.map((u) => `<option${u === g.unit ? ' selected' : ''}>${u}</option>`).join('')}</select>`
        : `<span class="un">${esc(g.unit)}</span>`;
      return `<div class="ing"><div class="nm">${nameHtml(da, en)}</div><input data-ia="${i}" inputmode="decimal" value="${formatAmount(g.amt)}" aria-label="Amount">${unit}<button class="x" type="button" data-ix="${i}" aria-label="Remove">✕</button></div>`;
    })
    .join('');
  $('#dsToList').disabled = !recipeDraft.ings.length;
  $('#dsToList').style.opacity = recipeDraft.ings.length ? 1 : 0.5;
}
function showIngredientSuggestions() {
  const { rest } = parseQuantity($('#ingNew').value),
    box = $('#ingSug');
  if (!rest) {
    box.innerHTML = '';
    box.className = '';
    return;
  }
  const have = new Set(recipeDraft.ings.map((g) => g.cid));
  const hits = rankEntries(
    Object.values(itemDatabase()).filter((e) => !have.has(e.id)),
    rest,
    categoryInfo,
  );
  box.className = 'sugg';
  box.innerHTML =
    hits
      .map(
        ({ e }) =>
          `<div class="sg" data-ic="${esc(e.id)}"><span>${nameHtml(e.da, e.en)}</span><span class="cat">${esc(standardAmount(e).unit)}</span></div>`,
      )
      .join('') +
    (findKnownItem(rest) ? '' : `<div class="sg new" data-inew="1">＋ New ingredient “${esc(rest)}”</div>`);
}
function addIngredient(e, isNew) {
  const { typed } = parseQuantity($('#ingNew').value),
    cid = itemKey(e.da);
  const i = recipeDraft.ings.findIndex((g) => g.cid === cid);
  if (i < 0) {
    // "500 g mel" when flour is stored in kg -> 0,5 kg (only between compatible units)
    const unit = isNew ? (typed && typed.unit) || 'pcs' : standardAmount(e).unit;
    let amt = typed && typed.amt != null ? typed.amt : standardAmount(e).amt;
    if (!isNew && typed && typed.unit && typed.amt != null) {
      const c = amountInUnit(typed.amt, typed.unit, unit);
      if (c != null) amt = c;
    }
    recipeDraft.ings.push({ cid, da: e.da, en: e.en || '', amt, unit, ...(isNew ? { isNew: true } : {}) });
  }
  $('#ingNew').value = '';
  showIngredientSuggestions();
  drawIngredients();
  const inp = document.querySelector(`#ingList [data-ia="${i < 0 ? recipeDraft.ings.length - 1 : i}"]`);
  if (inp) {
    inp.focus();
    inp.select();
  }
}
function addIngredientFromInput() {
  const { rest } = parseQuantity($('#ingNew').value);
  if (!rest) return;
  const e = findKnownItem(rest);
  if (e) addIngredient(e, false);
  else addIngredient({ da: rest[0].toUpperCase() + rest.slice(1), en: '' }, true);
}
$('#ingNew').addEventListener('input', showIngredientSuggestions);
$('#ingNew').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    addIngredientFromInput();
  }
});
$('#ingSug').addEventListener('click', (e) => {
  const c = e.target.closest('[data-ic]'),
    n = e.target.closest('[data-inew]');
  if (c) addIngredient(itemDatabase()[c.dataset.ic], false);
  else if (n) addIngredientFromInput();
});
$('#ingList').addEventListener('input', (e) => {
  const a = e.target.closest('[data-ia]');
  if (a) recipeDraft.ings[a.dataset.ia].amt = parseAmount(a.value);
});
$('#ingList').addEventListener('change', (e) => {
  const a = e.target.closest('[data-ia]'),
    u = e.target.closest('[data-iu]');
  if (a) {
    a.value = formatAmount(recipeDraft.ings[a.dataset.ia].amt);
  }
  if (u) {
    recipeDraft.ings[u.dataset.iu].unit = u.value;
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
    recipeDraft.ings.splice(+x.dataset.ix, 1);
    drawIngredients();
  }
});
$('#srvM').onclick = () => {
  if (recipeDraft.serves > 1) {
    recipeDraft.serves--;
    drawIngredients();
  }
};
$('#srvP').onclick = () => {
  if (recipeDraft.serves < 20) {
    recipeDraft.serves++;
    drawIngredients();
  }
};
// write the dialog back to the dish; new ingredients also go into the shared item database
function saveRecipeDraft() {
  const d = dishes.find((v) => v.id === recipeDraft.id),
    name = $('#dsName').value.trim().replace(/\s+/g, ' ');
  if (!d) return true;
  if (!name) {
    $('#dsName').focus();
    return false;
  }
  if (findDishByName(name, d.id)) {
    alert(`"${name}" is already saved.`);
    return false;
  }
  recipeDraft.ings.forEach((g) => {
    if (g.isNew) {
      if (!itemDatabase()[g.cid])
        saveCatalogEntry({
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
  saveDish({
    ...d,
    name,
    serves: recipeDraft.serves,
    ingredients: recipeDraft.ings.map(({ cid, da, en, amt, unit }) => ({ cid, da, en, amt, unit })),
  });
  return true;
}
function saveRecipeAndClose() {
  if (saveRecipeDraft()) $('#dsDlg').close();
}
$('#dsSave').onclick = saveRecipeAndClose;
$('#dsName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveRecipeAndClose();
  }
});
$('#dsCancel').onclick = () => $('#dsDlg').close();
$('#dsDel').onclick = () => {
  const d = dishes.find((v) => v.id === recipeDraft.id);
  if (d && confirm(`Delete "${d.name}"?`)) removeDish(d.id);
  $('#dsDlg').close();
};

// ---------- add a dish to the grocery list, scaled to N people ----------
// the recipe being edited, scaled from its "for N people" to `people`
const scaledDraftIngredients = (people) => scaleIngredients(recipeDraft.ings, people, recipeDraft.serves);
function showPeoplePreview() {
  const n = Math.max(1, Math.min(50, parseInt($('#ppN').value) || 1));
  $('#ppPrev').innerHTML = scaledDraftIngredients(n)
    .map((g) => `${formatAmount(g.amt)} ${esc(g.unit)} ${esc((itemDatabase()[g.cid] || g).da)}`)
    .join('<br>');
}
$('#dsToList').onclick = () => {
  if (!recipeDraft.ings.length || !saveRecipeDraft()) return;
  $('#ppTitle').textContent = `Add ${$('#dsName').value.trim()} to the grocery list`;
  $('#ppN').value = recipeDraft.serves;
  showPeoplePreview();
  $('#ppDlg').showModal();
  $('#ppTitle').focus();
};
$('#ppN').addEventListener('input', showPeoplePreview);
$('#ppM').onclick = () => {
  $('#ppN').value = Math.max(1, (parseInt($('#ppN').value) || 1) - 1);
  showPeoplePreview();
};
$('#ppP').onclick = () => {
  $('#ppN').value = Math.min(50, (parseInt($('#ppN').value) || 0) + 1);
  showPeoplePreview();
};
$('#ppCancel').onclick = () => $('#ppDlg').close();
$('#ppGo').onclick = () => {
  const n = Math.max(1, Math.min(50, parseInt($('#ppN').value) || 1));
  let added = 0,
    merged = 0,
    kept = [];
  for (const g of scaledDraftIngredients(n)) {
    const e = itemDatabase()[g.cid] || { da: g.da, en: g.en, cat: 'andet', amt: g.amt, unit: g.unit };
    const on = items.find((i) => !i.done && itemId(i) === g.cid);
    if (!on) {
      addToGroceryList(e, { amt: g.amt, unit: g.unit }, false);
      added++;
      continue;
    }
    // already on the list: add to its amount when the units can be combined (g↔kg, ml↔dl↔l)
    const q = itemQuantity(on),
      total = topUpAmount(q.amt, q.unit, g.amt, g.unit);
    if (total == null) {
      kept.push(e.da);
      continue;
    }
    saveItem(withAmount(on, total, q.unit));
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
