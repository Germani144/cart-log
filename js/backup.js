// Settings → Export data / Import data. The file format, its checks and the merge/replace rules are in logic.js;
// this file reads and writes the app's state and shows the preview.
// current state per collection: get = list of docs, write/remove = local + Firestore
const collectionStore = (priv) =>
  priv
    ? {
        todos: {
          get: () => privateTodos,
          set: (v) => {
            privateTodos = v;
            save('cl_ptodos', v);
          },
        },
        meta: {
          get: () => Object.values(privateMeta),
          set: (v) => {
            privateMeta = {};
            v.forEach((d) => (privateMeta[d.id] = d));
            save('cl_pmeta', privateMeta);
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
          get: () => Object.values(catalog),
          set: (v) => {
            catalog = {};
            v.forEach((d) => (catalog[d.id] = d));
            save('cl_shared', catalog);
          },
        },
        cats: {
          get: () => Object.values(customCategories),
          set: (v) => {
            customCategories = {};
            v.forEach((d) => (customCategories[d.id] = d));
            save('cl_cats', customCategories);
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
          get: () => Object.values(listMeta),
          set: (v) => {
            listMeta = {};
            v.forEach((d) => (listMeta[d.id] = d));
            save('cl_meta', listMeta);
          },
        },
      };
// {collection: [documents]} for one side (shared list or this phone's private lists)
const currentDocs = (priv, cols) => Object.fromEntries(cols.map((c) => [c, collectionStore(priv)[c].get()]));
function exportData() {
  const sec = (priv, cols) => exportSection(currentDocs(priv, cols), cols, priv);
  const data = {
    format: EXP_FORMAT,
    version: EXP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: $('#ver').textContent,
    shared: sec(false, SHARED_COLLECTIONS),
    private: privateCode ? sec(true, PRIVATE_COLLECTIONS) : null,
  };
  const txt = JSON.stringify(data, null, 1);
  // the list codes are the keys to the data: they must never end up in a file
  if ((listCode && txt.includes(listCode)) || (privateCode && txt.includes(privateCode)))
    return alert('Export stopped: the file would contain a list code. Nothing was saved.');
  const chk = validateExport(JSON.parse(txt));
  if (chk.errors)
    return alert("Export stopped, the data didn't pass its own check:\n" + chk.errors.slice(0, 5).join('\n'));
  const url = URL.createObjectURL(new Blob([txt], { type: 'application/json' })),
    a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(new Date());
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 2000);
}
$('#expBtn').onclick = exportData;
let pendingImport = null; // {data, mode, name}
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
  const r = validateExport(raw);
  if (r.errors)
    return alert(
      `Can't import: the file didn't pass the check. Nothing was changed.\n\n${r.errors.slice(0, 6).join('\n')}${r.errors.length > 6 ? `\n…and ${r.errors.length - 6} more` : ''}`,
    );
  pendingImport = {
    data: r.data,
    mode: 'merge',
    name: f.name,
    at: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    ver: typeof raw.appVersion === 'string' ? raw.appVersion : '',
  };
  $('#dlg').close();
  drawImportPreview();
  $('#ioDlg').showModal();
  $('#ioDlg .dt').focus();
});
const IMPORT_LABELS = {
  items: 'Groceries on the list',
  catalog: 'Items you added to the database',
  cats: 'Your categories',
  todos: 'To-dos and headings',
  dishes: 'Recipes',
  meta: 'List settings',
};
const previewCounts = (priv, c, list) => importCounts(collectionStore(priv)[c].get(), list);
function drawImportPreview() {
  const { data } = pendingImport,
    row = (label, st) =>
      `<div class="ioc"><span>${esc(label)}</span><span class="mu">${st.n}${pendingImport.mode === 'merge' ? ` (${st.fresh} new)` : ''}</span></div>`;
  const at = pendingImport.at ? new Date(pendingImport.at) : null;
  $('#ioInfo').textContent =
    `${pendingImport.name}${at && !isNaN(at) ? ` · exported ${at.toLocaleString()}` : ''}${pendingImport.ver ? ` · ${pendingImport.ver}` : ''}`;
  let h =
    `<div class="lbl" style="margin-top:4px">This shared list</div>` +
    SHARED_COLLECTIONS.map((c) => row(IMPORT_LABELS[c], previewCounts(false, c, data.shared[c]))).join('');
  if (data.private) {
    h += `<div class="lbl">Private lists (this phone)</div>`;
    h += privateCode
      ? PRIVATE_COLLECTIONS.map((c) =>
          row(c === 'todos' ? 'Private to-dos and headings' : 'Private lists', previewCounts(true, c, data.private[c])),
        ).join('')
      : `<div class="mu" style="font-size:13px">This phone has no private code yet, so private to-dos are skipped. Make a private list first, then import again.</div>`;
  }
  $('#ioCounts').innerHTML = h;
  document
    .querySelectorAll('#ioDlg [data-im]')
    .forEach((b) => b.classList.toggle('sel', b.dataset.im === pendingImport.mode));
  $('#ioHint').textContent =
    pendingImport.mode === 'merge'
      ? "Adds entries that aren't here yet. Everything already here is kept as it is (matched by id)."
      : "Deletes everything in this shared list (and this phone's private lists, if the file has them) and restores the file. Every phone on this list sees the change.";
  $('#ioGo').textContent = pendingImport.mode === 'merge' ? 'Import' : 'Replace…';
}
$('#ioDlg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-im]');
  if (b) {
    pendingImport.mode = b.dataset.im;
    drawImportPreview();
  }
});
$('#ioCancel').onclick = () => {
  pendingImport = null;
  $('#ioDlg').close();
};
function applyImport(data, mode) {
  const run = (priv, cols, sec) => {
    const st = collectionStore(priv),
      w = priv ? writePrivate : writeShared,
      rm = priv ? deletePrivate : deleteShared;
    for (const c of cols) {
      const plan = planImport(st[c].get(), sec[c] || [], mode);
      plan.remove.forEach((id) => rm(c, id));
      plan.write.forEach((d) => w(c, d));
      st[c].set(plan.next);
    }
  };
  run(false, SHARED_COLLECTIONS, data.shared);
  if (data.private && privateCode) run(true, PRIVATE_COLLECTIONS, data.private);
}
$('#ioGo').onclick = () => {
  if (!pendingImport) return;
  if (
    pendingImport.mode === 'replace' &&
    !confirm(
      "Replace everything in this shared list with the file? This changes the list on every phone that uses it and can't be undone. (Tip: export first.)",
    )
  )
    return;
  const mode = pendingImport.mode;
  applyImport(pendingImport.data, mode);
  pendingImport = null;
  $('#ioDlg').close();
  render();
  alert(
    mode === 'merge'
      ? 'Imported: entries that were missing have been added.'
      : 'Replaced: the list now matches the file.',
  );
};
$('#shareBtn').onclick = () =>
  navigator.share({ title: 'Home log', text: 'Join our Home log', url: inviteLink() }).catch(() => {});
$('#copyBtn').onclick = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink());
    $('#copyBtn').textContent = 'Copied ✓';
  } catch {
    prompt('Copy this link', inviteLink());
  }
  setTimeout(() => ($('#copyBtn').textContent = 'Copy link'), 1500);
};
$('#leaveBtn').onclick = () => {
  if (!confirm('Leave this list on this phone? The list itself stays for whoever else has the code.')) return;
  save('cl_left', listCode);
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  listCode = '';
  save('cl_code', '');
  clearLocalListData();
  keepCodeInUrl();
  $('#dlg').close();
  render();
};
