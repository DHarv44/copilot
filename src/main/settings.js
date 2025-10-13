const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');
let cache = {};

function load() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      cache = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[settings] load failed', err);
  }
}

function save() {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error('[settings] save failed', err);
  }
}

function get(key, fallback) {
  return cache[key] !== undefined ? cache[key] : fallback;
}

function set(key, value) {
  cache[key] = value;
  save();
}

// Load on require
load();

module.exports = { get, set };
