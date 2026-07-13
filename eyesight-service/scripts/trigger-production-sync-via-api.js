#!/usr/bin/env node
/**
 * Trigger production session snapshot sync by calling APIs that run
 * syncAssignmentSessionSnapshots (admin: list assignments per patient).
 *
 * Requires admin credentials (not committed):
 *   PRODUCTION_API_URL=https://api.nhuocthi.vn/api/v1
 *   PRODUCTION_ADMIN_EMAIL=...
 *   PRODUCTION_ADMIN_PASSWORD=...
 *
 * Usage:
 *   node scripts/trigger-production-sync-via-api.js
 *   node scripts/trigger-production-sync-via-api.js --patientId 12
 */
/* eslint-disable no-console */

const API_BASE = (process.env.PRODUCTION_API_URL || 'https://api.nhuocthi.vn/api/v1').replace(/\/$/, '');
const EMAIL = process.env.PRODUCTION_ADMIN_EMAIL;
const PASSWORD = process.env.PRODUCTION_ADMIN_PASSWORD;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) {
      out[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json.message || json.raw || res.statusText;
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`);
  }
  return json;
}

async function login() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Set PRODUCTION_ADMIN_EMAIL and PRODUCTION_ADMIN_PASSWORD in the environment (e.g. export in terminal).'
    );
  }

  const data = await request('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASSWORD },
  });

  const token = data.tokens?.access?.token || data.accessToken || data.token;
  if (!token) {
    throw new Error('Login succeeded but no access token in response');
  }
  return token;
}

async function listAllPatients(token) {
  const rows = [];
  let page = 1;
  const limit = 100;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const data = await request(`/patients?page=${page}&limit=${limit}`, { token });
    const batch = data.rows || data.data?.rows || [];
    rows.push(...batch);
    const totalPages = data.totalPages || data.data?.totalPages || 1;
    if (page >= totalPages || batch.length === 0) break;
    page += 1;
  }

  return rows;
}

async function syncAllViaMaintenance(token) {
  return request('/exercise-assignments/maintenance/sync-sessions', {
    method: 'POST',
    token,
  });
}

async function syncPatientAssignments(token, patientId) {
  await request(`/exercise-assignments/patients/${patientId}/assignments?limit=100&page=1`, {
    token,
  });
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(`API: ${API_BASE}`);

  const token = await login();
  console.log('Logged in as admin.');

  if (args.patientId) {
    const patientId = Number(args.patientId);
    try {
      await syncAllViaMaintenance(token);
      console.log('Synced via maintenance endpoint (all assignments).');
    } catch (err) {
      if (!String(err.message).includes('404')) throw err;
      await syncPatientAssignments(token, patientId);
      console.log(`Synced assignments for patient ${patientId} (legacy API).`);
    }
    return;
  }

  try {
    const result = await syncAllViaMaintenance(token);
    console.log('Maintenance sync:', result.data || result);
    return;
  } catch (err) {
    if (!String(err.message).includes('404')) throw err;
    console.log('Maintenance endpoint not deployed yet; falling back to per-patient refresh…');
  }

  const patients = await listAllPatients(token);
  console.log(`Found ${patients.length} patient(s). Refreshing assignments (sync snapshots)…`);

  let ok = 0;
  for (const patient of patients) {
    const id = patient.id;
    try {
      // eslint-disable-next-line no-await-in-loop
      await syncPatientAssignments(token, id);
      ok += 1;
      process.stdout.write('.');
    } catch (err) {
      console.error(`\nPatient ${id} failed: ${err.message}`);
    }
  }

  console.log(`\nDone. Processed ${ok}/${patients.length} patients.`);
  console.log('Patients should refresh portal exercise list (F5) to see updated compliance %.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
