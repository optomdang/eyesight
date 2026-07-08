import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viPath = path.join(__dirname, '../src/utils/languages/vi.json');
const enPath = path.join(__dirname, '../src/utils/languages/en.json');

const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (let key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function compareObjects(obj1, obj2, name1 = 'VI', name2 = 'EN') {
  const keys1 = new Set(Object.keys(obj1 || {}));
  const keys2 = new Set(Object.keys(obj2 || {}));
  
  const missing1 = [...keys2].filter(k => !keys1.has(k));
  const missing2 = [...keys1].filter(k => !keys2.has(k));
  
  return { missing1, missing2, keys1: keys1.size, keys2: keys2.size };
}

function deepCompare(obj1, obj2, path = '', results = {}) {
  const keys1 = new Set(Object.keys(obj1 || {}));
  const keys2 = new Set(Object.keys(obj2 || {}));
  
  const allKeys = new Set([...keys1, ...keys2]);
  
  for (let key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const val1 = obj1?.[key];
    const val2 = obj2?.[key];
    
    if (!keys1.has(key)) {
      if (!results.missingInVI) results.missingInVI = [];
      results.missingInVI.push(currentPath);
    } else if (!keys2.has(key)) {
      if (!results.missingInEN) results.missingInEN = [];
      results.missingInEN.push(currentPath);
    } else {
      const isObj1 = typeof val1 === 'object' && val1 !== null && !Array.isArray(val1);
      const isObj2 = typeof val2 === 'object' && val2 !== null && !Array.isArray(val2);
      
      if (isObj1 && isObj2) {
        deepCompare(val1, val2, currentPath, results);
      } else if (isObj1 !== isObj2) {
        if (!results.typeMismatch) results.typeMismatch = [];
        results.typeMismatch.push({
          key: currentPath,
          viType: isObj1 ? 'object' : typeof val1,
          enType: isObj2 ? 'object' : typeof val2
        });
      }
    }
  }
  
  return results;
}

const viKeys = getAllKeys(vi).sort();
const enKeys = getAllKeys(en).sort();

console.log('=== DETAILED TRANSLATION COMPARISON ===\n');
console.log(`📊 Total Keys:`);
console.log(`   VI: ${viKeys.length} keys`);
console.log(`   EN: ${enKeys.length} keys`);
console.log(`   Difference: ${Math.abs(viKeys.length - enKeys.length)}\n`);

// Top-level sections comparison
console.log('📁 Top-Level Objects:');
const topLevelVI = Object.keys(vi);
const topLevelEN = Object.keys(en);
console.log(`   VI: ${topLevelVI.length} sections [${topLevelVI.sort().join(', ')}]`);
console.log(`   EN: ${topLevelEN.length} sections [${topLevelEN.sort().join(', ')}]\n`);

const missingSectionsInEN = topLevelVI.filter(k => !topLevelEN.includes(k));
const missingSectionsInVI = topLevelEN.filter(k => !topLevelVI.includes(k));

if (missingSectionsInEN.length > 0) {
  console.log(`❌ Sections missing in EN: ${missingSectionsInEN.join(', ')}\n`);
}
if (missingSectionsInVI.length > 0) {
  console.log(`❌ Sections missing in VI: ${missingSectionsInVI.join(', ')}\n`);
}

// Detailed section-by-section comparison
console.log('🔍 Section-by-Section Analysis:\n');
let allSynced = true;
const commonSections = topLevelVI.filter(k => topLevelEN.includes(k)).sort();

for (let section of commonSections) {
  const comp = compareObjects(vi[section], en[section]);
  const status = comp.missing1.length === 0 && comp.missing2.length === 0 ? '✅' : '⚠️';
  
  if (comp.missing1.length > 0 || comp.missing2.length > 0) {
    allSynced = false;
    console.log(`${status} ${section}:`);
    console.log(`   VI: ${comp.keys1} keys | EN: ${comp.keys2} keys`);
    
    if (comp.missing2.length > 0) {
      console.log(`   ❌ Missing in EN (${comp.missing2.length}): ${comp.missing2.slice(0, 5).join(', ')}${comp.missing2.length > 5 ? '...' : ''}`);
    }
    if (comp.missing1.length > 0) {
      console.log(`   ❌ Missing in VI (${comp.missing1.length}): ${comp.missing1.slice(0, 5).join(', ')}${comp.missing1.length > 5 ? '...' : ''}`);
    }
    console.log();
  }
}

// Deep comparison
const deepResults = deepCompare(vi, en);

console.log('\n📋 Summary:');
if (deepResults.missingInVI) {
  console.log(`❌ Keys missing in VI: ${deepResults.missingInVI.length}`);
  deepResults.missingInVI.slice(0, 10).forEach(k => console.log(`   - ${k}`));
  if (deepResults.missingInVI.length > 10) console.log(`   ... and ${deepResults.missingInVI.length - 10} more`);
}
if (deepResults.missingInEN) {
  console.log(`❌ Keys missing in EN: ${deepResults.missingInEN.length}`);
  deepResults.missingInEN.slice(0, 10).forEach(k => console.log(`   - ${k}`));
  if (deepResults.missingInEN.length > 10) console.log(`   ... and ${deepResults.missingInEN.length - 10} more`);
}
if (deepResults.typeMismatch) {
  console.log(`⚠️  Type mismatches: ${deepResults.typeMismatch.length}`);
  deepResults.typeMismatch.slice(0, 5).forEach(m => {
    console.log(`   - ${m.key}: VI=${m.viType}, EN=${m.enType}`);
  });
}

if (allSynced && !deepResults.missingInVI && !deepResults.missingInEN && !deepResults.typeMismatch) {
  console.log('\n✅ Perfect! All translations are 100% in sync!');
} else {
  const totalIssues = (deepResults.missingInVI?.length || 0) + (deepResults.missingInEN?.length || 0) + (deepResults.typeMismatch?.length || 0);
  console.log(`\n⚠️  Found ${totalIssues} issues that need attention`);
  process.exit(1);
}
