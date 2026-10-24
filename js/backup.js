// Settings → Export data / Import data.
// ---------- export / import ----------
// File: {format:'home-log-export', version:1, exportedAt, appVersion, shared:{items,catalog,cats,todos,dishes,meta}, private:{todos,meta}|null}
// Only known fields are exported, and an import is checked completely (format, version, every field) before anything is written.
const EXP_FORMAT = 'home-log-export',
  EXP_VERSION = 1;
const V = {
  str:
    (max = 2000) =>
    (v) =>
      (typeof v === 'string' && v.length <= max) || `must be text (max ${max} characters)`,
  id: (v) =>
    (typeof v === 'string' &&
      v.length >= 1 &&
      v.length <= 200 &&
      !v.includes('/') &&
      v !== '.' &&
      v !== '..' &&
      !/^__.*__$/.test(v)) ||
    'must be a valid id',
  num: (v) => (typeof v === 'number' && isFinite(v)) || 'must be a number',
  ts: (v) => (typeof v === 'number' && isFinite(v) && v >= 0) || 'must be a timestamp',
  amt: (v) => (typeof v === 'number' && isFinite(v) && v > 0 && v <= 1e6) || 'must be a positive amount',
  int: (lo, hi) => (v) => (Number.isInteger(v) && v >= lo && v <= hi) || `must be a whole number ${lo}–${hi}`,
  bool: (v) => typeof v === 'boolean' || 'must be true or false',
  unit: (v) => UNITS.includes(v) || `must be one of ${UNITS.join(', ')}`,
  color: (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) || 'must be a colour like #2F855A',
  is: (x) => (v) => v === x || `must be "${x}"`,
};
const ING = { cid: V.id, da: V.str(200), en: V.str(200), amt: V.amt, unit: V.unit };
const SPEC = {
  items: {
    id: V.id,
    cid: V.str(200),
    da: V.str(200),
    en: V.str(200),
    text: V.str(200),
    qty: V.str(50),
    cat: V.str(100),
    done: V.bool,
    ts: V.ts,
    amt: V.amt,
    unit: V.unit,
  },
  catalog: {
    id: V.id,
    da: V.str(200),
    en: V.str(200),
    name: V.str(200),
    cat: V.str(100),
    amt: V.amt,
    unit: V.unit,
    n: V.int(0, 1e9),
    at: V.ts,
  },
  cats: { id: V.id, da: V.str(100), en: V.str(100), color: V.color },
  todos: { id: V.id, text: V.str(1000), done: V.bool, order: V.num, ts: V.ts, head: V.bool, list: V.id },
  dishes: {
    id: V.id,
    name: V.str(200),
    serves: V.int(1, 50),
    ingredients: (v) => (Array.isArray(v) && v.length <= 200) || 'must be a list (max 200)',
    ts: V.ts,
  },
};
const REQ = { items: [], catalog: [], cats: [], todos: ['text'], dishes: ['name'] };
// meta docs depend on their id: the dish-list title, Home's name/icon/title, or an extra to-do list
const metaSpec = (id, priv) =>
  !priv && id === 'dishes'
    ? { id: V.id, title: V.str(100) }
    : !priv && id === 'tl_main'
      ? { id: V.id, kind: V.is('tlmain'), name: V.str(30), emoji: V.str(16), title: V.str(40) }
      : /^tl_/.test(id)
        ? { id: V.id, kind: V.is('tl'), name: V.str(30), emoji: V.str(16), ts: V.ts, title: V.str(40) }
        : null;
const SHARED_COLS = ['items', 'catalog', 'cats', 'todos', 'dishes', 'meta'],
  PRIV_COLS = ['todos', 'meta'];
function pickKnown(doc, spec) {
  const o = {};
  for (const k in spec)
    if (doc[k] !== undefined) o[k] = k === 'ingredients' ? doc[k].map((g) => pickKnown(g, ING)) : doc[k];
  return o;
}
function checkDoc(doc, spec, req, where, errs, needId = true) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return errs.push(`${where}: must be an object`);
  if (!spec) return errs.push(`${where}: unknown kind of entry (id "${String(doc.id).slice(0, 40)}")`);
  for (const k of Object.keys(doc)) {
    if (!spec[k]) {
      errs.push(`${where}: unknown field "${k.slice(0, 40)}"`);
      continue;
    }
    const r = spec[k](doc[k]);
    if (r !== true) errs.push(`${where}.${k}: ${r}`);
  }
  if (needId && doc.id === undefined) errs.push(`${where}.id: missing`);
  for (const k of req || []) if (doc[k] === undefined) errs.push(`${where}.${k}: missing`);
  if (Array.isArray(doc.ingredients))
    doc.ingredients.forEach((g, i) =>
      checkDoc(g, ING, ['cid', 'da', 'amt', 'unit'], `${where}.ingredients[${i}]`, errs, false),
    );
}
// returns {data} or {errors:[...]}
function checkExport(raw) {
  const errs = [],
    out = { shared: {}, private: null };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ["The file isn't a Home log export."] };
  if (raw.format !== EXP_FORMAT)
    return { errors: ["The file isn't a Home log export (format field missing or wrong)."] };
  if (raw.version !== EXP_VERSION)
    return {
      errors: [
        `Unsupported export version ${String(raw.version).slice(0, 20)} (this app reads version ${EXP_VERSION}).`,
      ],
    };
  for (const k of Object.keys(raw))
    if (!['format', 'version', 'exportedAt', 'appVersion', 'shared', 'private'].includes(k))
      errs.push(`unknown top-level field "${k.slice(0, 40)}"`);
  if (raw.exportedAt !== undefined && (typeof raw.exportedAt !== 'string' || raw.exportedAt.length > 40))
    errs.push('exportedAt: must be a date');
  if (raw.appVersion !== undefined && (typeof raw.appVersion !== 'string' || raw.appVersion.length > 20))
    errs.push('appVersion: must be text');
  const sec = (obj, cols, priv, label) => {
    const res = {};
    if (obj == null) return res;
    if (typeof obj !== 'object' || Array.isArray(obj)) {
      errs.push(`${label}: must be an object`);
      return res;
    }
    for (const k of Object.keys(obj)) if (!cols.includes(k)) errs.push(`${label}: unknown section "${k.slice(0, 40)}"`);
    for (const c of cols) {
      const list = obj[c];
      if (list === undefined) {
        res[c] = [];
        continue;
      } // older/smaller exports may leave sections out
      if (!Array.isArray(list)) {
        errs.push(`${label}.${c}: must be a list`);
        continue;
      }
      if (list.length > 5000) {
        errs.push(`${label}.${c}: too many entries (${list.length})`);
        continue;
      }
      const seen = new Set();
      list.forEach((d, i) => {
        const where = `${label}.${c}[${i}]`;
        checkDoc(
          d,
          c === 'meta' ? (d && typeof d.id === 'string' ? metaSpec(d.id, priv) : null) : SPEC[c],
          c === 'meta' ? [] : REQ[c],
          where,
          errs,
        );
        if (d && typeof d.id === 'string') {
          if (seen.has(d.id)) errs.push(`${where}.id: "${d.id.slice(0, 40)}" appears twice`);
          seen.add(d.id);
        }
      });
      res[c] = list;
    }
    return res;
  };
  out.shared = sec(raw.shared, SHARED_COLS, false, 'shared');
  if (raw.private != null) out.private = sec(raw.private, PRIV_COLS, true, 'private');
  return errs.length ? { errors: errs } : { data: out };
}
// current state per collection: get = list of docs, write/remove = local + Firestore
const store_ = (priv) =>
  priv
    ? {
        todos: {
          get: () => ptodos,
          set: (v) => {
            ptodos = v;
            save('cl_ptodos', v);
          },
        },
        meta: {
          get: () => Object.values(pmeta),
          set: (v) => {
            pmeta = {};
            v.forEach((d) => (pmeta[d.id] = d));
            save('cl_pmeta', pmeta);
          },
        },
      }
    : {
        items: {
          get: () => items,
          set: (v) => {
            items = v;
            save('cl_items', v);
          },
        },
        catalog: {
          get: () => Object.values(shared),
          set: (v) => {
            shared = {};
            v.forEach((d) => (shared[d.id] = d));
            save('cl_shared', shared);
          },
        },
        cats: {
          get: () => Object.values(customCats),
          set: (v) => {
            customCats = {};
            v.forEach((d) => (customCats[d.id] = d));
            save('cl_cats', customCats);
          },
        },
        todos: {
          get: () => todos,
          set: (v) => {
            todos = v;
            save('cl_todos', v);
          },
        },
        dishes: {
          get: () => dishes,
          set: (v) => {
            dishes = v;
            save('cl_dishes', v);
          },
        },
        meta: {
          get: () => Object.values(meta),
          set: (v) => {
            meta = {};
            v.forEach((d) => (meta[d.id] = d));
            save('cl_meta', meta);
          },
        },
      };
function exportData() {
  const pick = (c, d, priv) => pickKnown(d, c === 'meta' ? metaSpec(d.id, priv) || {} : SPEC[c]);
  const sec = (priv, cols) => {
    const st = store_(priv),
      o = {};
    cols.forEach(
      (c) =>
        (o[c] = st[c]
          .get()
          .map((d) => pick(c, d, priv))
          .filter((d) => d.id !== undefined)),
    );
    return o;
  };
  const data = {
    format: EXP_FORMAT,
    version: EXP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: $('#ver').textContent,
    shared: sec(false, SHARED_COLS),
    private: me ? sec(true, PRIV_COLS) : null,
  };
  const txt = JSON.stringify(data, null, 1);
  // the list codes are the keys to the data: they must never end up in a file
  if ((listCode && txt.includes(listCode)) || (me && txt.includes(me)))
    return alert('Export stopped: the file would contain a list code. Nothing was saved.');
  const chk = checkExport(JSON.parse(txt));
  if (chk.errors)
    return alert("Export stopped, the data didn't pass its own check:\n" + chk.errors.slice(0, 5).join('\n'));
  const d = new Date(),
    day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' })),
    a = document.createElement('a');
  a.href = url;
  a.download = `home-log-${day}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 2000);
}
$('#expBtn').onclick = exportData;
let imp = null; // {data, mode, name}
$('#impBtn').onclick = () => {
  $('#impFile').value = '';
  $('#impFile').click();
};
$('#impFile').addEventListener('change', async () => {
  const f = $('#impFile').files[0];
  if (!f) return;
  if (f.size > 5e6) return alert('That file is too big for a Home log export (max 5 MB).');
  let raw;
  try {
    raw = JSON.parse(await f.text());
  } catch {
    return alert("Can't import: the file isn't valid JSON. Nothing was changed.");
  }
  const r = checkExport(raw);
  if (r.errors)
    return alert(
      `Can't import: the file didn't pass the check. Nothing was changed.\n\n${r.errors.slice(0, 6).join('\n')}${r.errors.length > 6 ? `\n…and ${r.errors.length - 6} more` : ''}`,
    );
  imp = {
    data: r.data,
    mode: 'merge',
    name: f.name,
    at: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    ver: typeof raw.appVersion === 'string' ? raw.appVersion : '',
  };
  $('#dlg').close();
  drawImp();
  $('#ioDlg').showModal();
  $('#ioDlg .dt').focus();
});
const LABEL = {
  items: 'Groceries on the list',
  catalog: 'Items you added to the database',
  cats: 'Your categories',
  todos: 'To-dos and headings',
  dishes: 'Recipes',
  meta: 'List settings',
};
function impStats(priv, c, list) {
  const have = new Set(
    store_(priv)
      [c].get()
      .map((d) => d.id),
  );
  return { n: list.length, fresh: list.filter((d) => !have.has(d.id)).length };
}
function drawImp() {
  const { data } = imp,
    row = (label, st) =>
      `<div class="ioc"><span>${esc(label)}</span><span class="mu">${st.n}${imp.mode === 'merge' ? ` (${st.fresh} new)` : ''}</span></div>`;
  const at = imp.at ? new Date(imp.at) : null;
  $('#ioInfo').textContent =
    `${imp.name}${at && !isNaN(at) ? ` · exported ${at.toLocaleString()}` : ''}${imp.ver ? ` · ${imp.ver}` : ''}`;
  let h =
    `<div class="lbl" style="margin-top:4px">This shared list</div>` +
    SHARED_COLS.map((c) => row(LABEL[c], impStats(false, c, data.shared[c]))).join('');
  if (data.private) {
    h += `<div class="lbl">Private lists (this phone)</div>`;
    h += me
      ? PRIV_COLS.map((c) =>
          row(c === 'todos' ? 'Private to-dos and headings' : 'Private lists', impStats(true, c, data.private[c])),
        ).join('')
      : `<div class="mu" style="font-size:13px">This phone has no private code yet, so private to-dos are skipped. Make a private list first, then import again.</div>`;
  }
  $('#ioCounts').innerHTML = h;
  document.querySelectorAll('#ioDlg [data-im]').forEach((b) => b.classList.toggle('sel', b.dataset.im === imp.mode));
  $('#ioHint').textContent =
    imp.mode === 'merge'
      ? "Adds entries that aren't here yet. Everything already here is kept as it is (matched by id)."
      : "Deletes everything in this shared list (and this phone's private lists, if the file has them) and restores the file. Every phone on this list sees the change.";
  $('#ioGo').textContent = imp.mode === 'merge' ? 'Import' : 'Replace…';
}
$('#ioDlg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-im]');
  if (b) {
    imp.mode = b.dataset.im;
    drawImp();
  }
});
$('#ioCancel').onclick = () => {
  imp = null;
  $('#ioDlg').close();
};
function applyImport(data, mode) {
  const run = (priv, cols, sec) => {
    const st = store_(priv),
      w = priv ? putP : put,
      rm = priv ? delP : del;
    for (const c of cols) {
      const incoming = sec[c] || [],
        cur = st[c].get(),
        ids = new Set(incoming.map((d) => d.id));
      if (mode === 'replace') {
        cur.filter((d) => !ids.has(d.id)).forEach((d) => rm(c, d.id));
        incoming.forEach((d) => w(c, d));
        st[c].set(incoming.map((d) => ({ ...d })));
      } else {
        const have = new Set(cur.map((d) => d.id)),
          add = incoming.filter((d) => !have.has(d.id));
        add.forEach((d) => w(c, d));
        st[c].set([...cur, ...add.map((d) => ({ ...d }))]);
      }
    }
  };
  run(false, SHARED_COLS, data.shared);
  if (data.private && me) run(true, PRIV_COLS, data.private);
}
$('#ioGo').onclick = () => {
  if (!imp) return;
  if (
    imp.mode === 'replace' &&
    !confirm(
      "Replace everything in this shared list with the file? This changes the list on every phone that uses it and can't be undone. (Tip: export first.)",
    )
  )
    return;
  const mode = imp.mode;
  applyImport(imp.data, mode);
  imp = null;
  $('#ioDlg').close();
  render();
  alert(
    mode === 'merge'
      ? 'Imported: entries that were missing have been added.'
      : 'Replaced: the list now matches the file.',
  );
};
$('#shareBtn').onclick = () =>
  navigator.share({ title: 'Home log', text: 'Join our Home log', url: link() }).catch(() => {});
$('#copyBtn').onclick = async () => {
  try {
    await navigator.clipboard.writeText(link());
    $('#copyBtn').textContent = 'Copied ✓';
  } catch {
    prompt('Copy this link', link());
  }
  setTimeout(() => ($('#copyBtn').textContent = 'Copy link'), 1500);
};
$('#leaveBtn').onclick = () => {
  if (!confirm('Leave this list on this phone? The list itself stays for whoever else has the code.')) return;
  save('cl_left', listCode);
  unsubs.forEach((u) => u());
  unsubs = [];
  listCode = '';
  save('cl_code', '');
  resetLocal();
  keepCodeInUrl();
  $('#dlg').close();
  render();
};
