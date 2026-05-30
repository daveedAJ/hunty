#!/usr/bin/env node
/**
 * Validates store metadata files exist before EAS submit.
 * Exits 0 when store.config.json and eas.json are present and parseable.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const required = ['eas.json', 'store.config.json', 'app.json'];

let ok = true;

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error(`Missing required file: ${file}`);
    ok = false;
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON in ${file}:`, err.message);
    ok = false;
  }
}

const storeConfig = JSON.parse(fs.readFileSync(path.join(root, 'store.config.json'), 'utf8'));
if (!storeConfig.apple?.info?.['en-US']?.title) {
  console.error('store.config.json: missing apple.info.en-US.title');
  ok = false;
}

if (ok) {
  console.log('Store metadata validation passed.');
  process.exit(0);
}

process.exit(1);
