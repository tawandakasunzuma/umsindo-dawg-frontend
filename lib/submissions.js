import fs from 'fs';
import path from 'path';

const DB = path.join(process.cwd(), 'data', 'submissions.json');

// Read the JSON file and parse it to a JS array
function readAll() {
  if (!fs.existsSync(DB)) return [];
  return JSON.parse(fs.readFileSync(DB, 'utf8') || '[]');
}

// Write the updated array back to the JSON file
function writeAll(arr) {
  fs.writeFileSync(DB, JSON.stringify(arr, null, 2));
}

// Create a new submission
export function createSubmission(obj) {
  const all = readAll();
  const rec = {
    id: Date.now().toString(),
    status: obj.status || 'pending',
    createdAt: new Date().toISOString(),
    ...obj,
  };
  all.push(rec);
  writeAll(all);
  return rec;
}

// List submissions, optionally filtered by status
export function listSubmissions(status) {
  const all = readAll();
  return status ? all.filter(s => s.status === status) : all;
}

// Update a submission by id
export function updateSubmission(id, updates = {}) {
  const all = readAll();
  const item = all.find(i => i.id === id);
  if (!item) return null;
  Object.assign(item, updates);
  writeAll(all);
  return item;
}
