#!/usr/bin/env node
/**
 * Script to check if Vietnamese and English translation files are in sync
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LANGUAGES_DIR = path.join(__dirname, '../src/utils/languages');
const VI_FILE = path.join(LANGUAGES_DIR, 'vi.json');
const EN_FILE = path.join(LANGUAGES_DIR, 'en.json');

// Function to flatten nested object keys
function flattenKeys(obj, prefix = '') {
  let keys = [];
  for (let key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(flattenKeys(obj[key], `${prefix}${key}.`));
    } else {
      keys.push(`${prefix}${key}`);
    }
  }
  return keys;
}

try {
  // Read both files
  const viContent = JSON.parse(fs.readFileSync(VI_FILE, 'utf8'));
  const enContent = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));

  // Get all keys from both files
  const viKeys = flattenKeys(viContent).sort();
  const enKeys = flattenKeys(enContent).sort();

  // Find missing keys
  const missingInEn = viKeys.filter(key => !enKeys.includes(key));
  const missingInVi = enKeys.filter(key => !viKeys.includes(key));

  console.log('🌍 Translation Sync Check');
  console.log('========================');
  console.log(`Vietnamese keys: ${viKeys.length}`);
  console.log(`English keys: ${enKeys.length}`);
  console.log('');

  if (missingInEn.length > 0) {
    console.log('❌ Keys missing in English file:');
    missingInEn.forEach(key => console.log(`  - ${key}`));
    console.log('');
  }

  if (missingInVi.length > 0) {
    console.log('❌ Keys missing in Vietnamese file:');
    missingInVi.forEach(key => console.log(`  - ${key}`));
    console.log('');
  }

  if (missingInEn.length === 0 && missingInVi.length === 0) {
    console.log('✅ All translation keys are synchronized!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  • Total translation keys: ${viKeys.length}`);
    console.log('  • Vietnamese: Complete ✅');
    console.log('  • English: Complete ✅');
    process.exit(0);
  } else {
    console.log('⚠️  Translation files are not synchronized.');
    console.log('Please add the missing keys to maintain consistency.');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error checking translation files:', error.message);
  process.exit(1);
}
