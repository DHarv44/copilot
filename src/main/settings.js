const { app: electronApp } = require('electron');
const fs = require('fs');
const path = require('path');

let SETTINGS_FILE = null;
let cache = {};

function getSettingsFile() {
  if (!SETTINGS_FILE) {
    SETTINGS_FILE = path.join(electronApp.getPath('userData'), 'settings.json');
  }
  return SETTINGS_FILE;
}

function load() {
  try {
    const file = getSettingsFile();
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      cache = JSON.parse(raw);
    }
  } catch (err) {
    console.error('[settings] load failed', err);
  }
}

function save() {
  try {
    const file = getSettingsFile();
    fs.writeFileSync(file, JSON.stringify(cache, null, 2), 'utf8');
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

module.exports = { get, set, load };
