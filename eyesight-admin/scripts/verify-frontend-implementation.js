#!/usr/bin/env node

/**
 * Frontend Implementation Verification Script
 * 
 * This script checks if all required frontend files for the inactive patient
 * access control feature are implemented correctly.
 * 
 * Usage: node scripts/verify-frontend-implementation.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  return fs.existsSync(fullPath);
}

function checkFileContains(filePath, searchStrings) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    return { exists: false, found: [] };
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const found = searchStrings.filter(str => content.includes(str));
  
  return {
    exists: true,
    found,
    missing: searchStrings.filter(str => !content.includes(str)),
    content
  };
}

function printHeader(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(title.toUpperCase(), 'cyan');
  log('='.repeat(60), 'cyan');
}

function printSection(title) {
  log(`\n--- ${title} ---`, 'blue');
}

function printResult(label, passed, details = '') {
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${label}`, color);
  if (details) {
    log(`  ${details}`, 'yellow');
  }
}

// Main verification
printHeader('Frontend Implementation Verification');

let totalChecks = 0;
let passedChecks = 0;

// Check 1: Service file
printSection('Service Layer');
totalChecks++;
const serviceCheck = checkFileContains('src/services/patient.service.ts', [
  'getMyPatientInfo',
  'GET /v1/me/info',
  'PatientInfo'
]);

if (serviceCheck.exists && serviceCheck.found.length === 3) {
  printResult('patient.service.ts has getMyPatientInfo function', true);
  passedChecks++;
} else if (serviceCheck.exists) {
  printResult('patient.service.ts exists but missing required content', false);
  log(`  Missing: ${serviceCheck.missing.join(', ')}`, 'yellow');
} else {
  printResult('patient.service.ts not found', false);
}

// Check 2: Hook file
printSection('Custom Hook');
totalChecks++;
const hookCheck = checkFileContains('src/hooks/usePatientStatus.ts', [
  'usePatientStatus',
  'isActive',
  'loading',
  'patientInfo',
  'treatmentStatus'
]);

if (hookCheck.exists && hookCheck.found.length === 5) {
  printResult('usePatientStatus hook implemented', true);
  passedChecks++;
} else if (hookCheck.exists) {
  printResult('usePatientStatus hook exists but incomplete', false);
  log(`  Missing: ${hookCheck.missing.join(', ')}`, 'yellow');
} else {
  printResult('usePatientStatus hook not found', false);
}

// Check 3: Hook tests
printSection('Hook Tests');
totalChecks++;
const hookTestCheck = checkFileExists('src/hooks/__tests__/usePatientStatus.test.ts');

if (hookTestCheck) {
  printResult('usePatientStatus tests exist', true);
  passedChecks++;
} else {
  printResult('usePatientStatus tests not found', false);
}

// Check 4: InactivePage component
printSection('InactivePage Component');
totalChecks++;
const inactivePageCheck = checkFileContains('src/features/portal/views/InactivePage.tsx', [
  'InactivePage',
  'Tài khoản tạm ngừng điều trị',
  'Bác sĩ phụ trách',
  'Đăng xuất',
  'usePatientStatus'
]);

if (inactivePageCheck.exists && inactivePageCheck.found.length === 5) {
  printResult('InactivePage component implemented', true);
  passedChecks++;
} else if (inactivePageCheck.exists) {
  printResult('InactivePage component exists but incomplete', false);
  log(`  Missing: ${inactivePageCheck.missing.join(', ')}`, 'yellow');
} else {
  printResult('InactivePage component not found', false);
}

// Check 5: InactivePage tests
printSection('InactivePage Tests');
totalChecks++;
const inactivePageTestCheck = checkFileExists('src/features/portal/views/__tests__/InactivePage.test.tsx');

if (inactivePageTestCheck) {
  printResult('InactivePage tests exist', true);
  passedChecks++;
} else {
  printResult('InactivePage tests not found', false);
}

// Check 6: Route guard (check if PortalRoutes.tsx exists and has relevant content)
printSection('Route Guard');
totalChecks++;
const routesCheck = checkFileContains('src/routes/PortalRoutes.tsx', [
  'usePatientStatus',
  'inactive',
  'InactivePage'
]);

if (routesCheck.exists && routesCheck.found.length >= 2) {
  printResult('PortalRoutes has route guard implementation', true);
  passedChecks++;
} else if (routesCheck.exists) {
  printResult('PortalRoutes exists but may be missing route guard', false);
  log(`  Found: ${routesCheck.found.join(', ')}`, 'yellow');
  log(`  Missing: ${routesCheck.missing.join(', ')}`, 'yellow');
} else {
  printResult('PortalRoutes.tsx not found', false);
}

// Check 7: TypeScript types
printSection('TypeScript Types');
totalChecks++;
// Check both possible locations for patient types
const typesCheck1 = checkFileContains('src/types/patient.ts', [
  'PatientInfo',
  'treatmentStatus'
]);
const typesCheck2 = checkFileContains('src/types/core/patient.ts', [
  'PatientInfo',
  'treatmentStatus'
]);

const typesCheck = typesCheck1.exists ? typesCheck1 : typesCheck2;

if (typesCheck.exists && typesCheck.found.length === 2) {
  printResult('Patient types defined', true);
  passedChecks++;
} else if (typesCheck.exists) {
  printResult('Patient types file exists but incomplete', false);
  log(`  Missing: ${typesCheck.missing.join(', ')}`, 'yellow');
} else {
  printResult('Patient types file not found', false);
  log('  Note: Types might be defined elsewhere', 'yellow');
}

// Summary
printHeader('Verification Summary');
log(`Total Checks: ${totalChecks}`, 'cyan');
log(`Passed: ${passedChecks}`, passedChecks === totalChecks ? 'green' : 'yellow');
log(`Failed: ${totalChecks - passedChecks}`, totalChecks - passedChecks === 0 ? 'green' : 'red');

const percentage = Math.round((passedChecks / totalChecks) * 100);
log(`\nCompletion: ${percentage}%`, percentage === 100 ? 'green' : 'yellow');

if (passedChecks === totalChecks) {
  log('\n✓ All frontend implementation checks passed!', 'green');
  log('You can proceed with manual testing.', 'green');
} else {
  log('\n✗ Some implementation checks failed.', 'red');
  log('Please review the missing components before manual testing.', 'yellow');
}

// Additional recommendations
printHeader('Recommendations');

if (!hookCheck.exists) {
  log('• Implement usePatientStatus hook in src/hooks/usePatientStatus.ts', 'yellow');
}

if (!inactivePageCheck.exists) {
  log('• Create InactivePage component in src/features/portal/views/InactivePage.tsx', 'yellow');
}

if (!routesCheck.exists || routesCheck.found.length < 2) {
  log('• Add route guard to PortalRoutes.tsx', 'yellow');
}

if (!serviceCheck.exists || serviceCheck.found.length < 3) {
  log('• Add getMyPatientInfo function to patient.service.ts', 'yellow');
}

if (!hookTestCheck) {
  log('• Add tests for usePatientStatus hook', 'yellow');
}

if (!inactivePageTestCheck) {
  log('• Add tests for InactivePage component', 'yellow');
}

log('\nFor detailed implementation guide, see:', 'cyan');
log('  eye-sight-service/.kiro/specs/inactive-patient-access-control/design.md', 'cyan');

process.exit(passedChecks === totalChecks ? 0 : 1);
