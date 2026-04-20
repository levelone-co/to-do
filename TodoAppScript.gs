// ============================================================
// To Do — Google Apps Script Backend
// Paste this into Extensions → Apps Script in your Sheet
// Then: Deploy → New deployment → Web app
//   Execute as: Me | Who has access: Anyone
// ============================================================

// ⬇️ Replace with YOUR Google Sheet ID (the long string from the sheet URL)
const SHEET_ID    = 'YOUR_SHEET_ID_HERE';
const SHEET_NAME  = 'Todos';
const DONE_SHEET  = 'Done';
const CONFIG_SHEET = 'Config';
const HEADERS     = ['id', 'text', 'section', 'done', 'tag', 'createdAt', 'dueDate', 'completedAt', 'notes', 'updatedAt'];

// ── Helpers ───────────────────────────────────────────────────

function getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  return sheet;
}

function getDoneSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(DONE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(DONE_SHEET);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  return sheet;
}

function getConfigSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG_SHEET);
    sheet.appendRow(['key', 'value']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  if (sheet.getFrozenRows() < 1) sheet.setFrozenRows(1);
  return sheet;
}

function getConfigValue(key) {
  const sheet = getConfigSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function setConfigValue(key, value) {
  const sheet = getConfigSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
  sheet.appendRow([key, value]);
}

function rowToObj(row) {
  return {
    id:          row[0],
    text:        row[1],
    section:     row[2],
    done:        row[3] === true || row[3] === 'TRUE',
    tag:         row[4] || null,
    createdAt:   row[5] || null,
    dueDate:     row[6] || null,
    completedAt: row[7] || null,
    notes:       row[8] || null,
    updatedAt:   row[9] || null
  };
}

function todoToRow(t) {
  return [
    t.id,
    t.text,
    t.section,
    t.done ? 'TRUE' : 'FALSE',
    t.tag || '',
    t.createdAt || new Date().toISOString(),
    t.dueDate || '',
    t.completedAt || '',
    t.notes || '',
    t.updatedAt || new Date().toISOString()
  ];
}

function cors(output) {
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET — read all todos ──────────────────────────────────────

function doGet(e) {
  try {
    // If config param is present, return config values
    const configKey = e && e.parameter && e.parameter.config;
    if (configKey) {
      const val = getConfigValue(configKey);
      const config = {};
      if (val) {
        try { config[configKey] = JSON.parse(val); } catch(ex) { config[configKey] = val; }
      }
      return cors({ ok: true, config });
    }

    const sheet = getSheet();
    const data  = sheet.getDataRange().getValues();
    if (data.length <= 1) return cors({ ok: true, todos: [] });

    const todos = data.slice(1)
      .filter(row => row[0]) // skip empty rows
      .map(rowToObj);

    return cors({ ok: true, todos });
  } catch(err) {
    return cors({ ok: false, error: err.message });
  }
}

// ── POST — write operations ───────────────────────────────────

function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const sheet  = getSheet();

    // ── SYNC: merge incoming todos with sheet (conflict resolution by updatedAt)
    if (action === 'sync') {
      const todos = body.todos || [];
      const data = sheet.getDataRange().getValues();
      const merged = {};

      // Build map of existing todos by ID
      for (let i = 1; i < data.length; i++) {
        const existing = rowToObj(data[i]);
        merged[existing.id] = existing;
      }

      // Merge incoming todos (newer versions overwrite older)
      todos.forEach(incoming => {
        const existing = merged[incoming.id];
        if (!existing) {
          merged[incoming.id] = incoming; // New item
        } else {
          const incomingTime = incoming.updatedAt ? new Date(incoming.updatedAt).getTime() : 0;
          const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          if (incomingTime > existingTime) {
            merged[incoming.id] = incoming; // Server update is newer
          }
          // else: existing is newer, keep it
        }
      });

      // Clear sheet data (but keep header row) and write merged data
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
      }

      const merged_todos = Object.values(merged);
      if (merged_todos.length) {
        const rows = merged_todos.map(todoToRow);
        sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
      }
      return cors({ ok: true, synced: merged_todos.length, merged: true });
    }

    // ── ADD: append a new todo ──
    if (action === 'add') {
      const t = body.todo;
      sheet.appendRow(todoToRow(t));
      return cors({ ok: true, added: t.id });
    }

    // ── UPDATE: update a single field on one row ──
    if (action === 'update') {
      const { id, field, value } = body;
      const data = sheet.getDataRange().getValues();
      const colIdx = HEADERS.indexOf(field);
      if (colIdx === -1) return cors({ ok: false, error: 'Unknown field: ' + field });

      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.getRange(i + 1, colIdx + 1).setValue(
            field === 'done' ? (value ? 'TRUE' : 'FALSE') : value
          );
          return cors({ ok: true, updated: id });
        }
      }
      return cors({ ok: false, error: 'Item not found: ' + id });
    }

    // ── DELETE: remove a row ──
    if (action === 'delete') {
      const { id } = body;
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.deleteRow(i + 1);
          return cors({ ok: true, deleted: id });
        }
      }
      return cors({ ok: false, error: 'Item not found: ' + id });
    }

    // ── ARCHIVE: move completed items to Done sheet ──
    if (action === 'archive') {
      const items = body.items || [];
      if (!items.length) return cors({ ok: true, archived: 0 });

      const doneSheet = getDoneSheet();
      const rows = items.map(todoToRow);
      doneSheet.getRange(doneSheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);

      // Remove archived items from Todos sheet
      const data = sheet.getDataRange().getValues();
      const idsToRemove = new Set(items.map(i => i.id));
      const rowsToDelete = [];
      for (let i = 1; i < data.length; i++) {
        if (idsToRemove.has(data[i][0])) rowsToDelete.push(i + 1);
      }
      // Delete from bottom up to preserve indices
      for (let i = rowsToDelete.length - 1; i >= 0; i--) {
        sheet.deleteRow(rowsToDelete[i]);
      }

      return cors({ ok: true, archived: items.length });
    }

    // ── SAVE CONFIG: store a key-value pair ──
    if (action === 'saveConfig') {
      const { key, value } = body;
      if (!key) return cors({ ok: false, error: 'Missing config key' });
      setConfigValue(key, value);
      return cors({ ok: true, saved: key });
    }

    return cors({ ok: false, error: 'Unknown action: ' + action });

  } catch(err) {
    return cors({ ok: false, error: err.message });
  }
}
