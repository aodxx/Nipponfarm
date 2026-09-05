#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getAccessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  try {
    return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error('No Google OAuth access token available. Set GOOGLE_OAUTH_ACCESS_TOKEN or authenticate with gcloud first.');
  }
}

function decodeFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('stringValue' in value) return value.stringValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  return null;
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

async function listCollection({ projectId, databaseId, collectionId, accessToken }) {
  const documents = [];
  let pageToken = '';
  do {
    const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collectionId)}`;
    const url = new URL(base);
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`${collectionId}: Firestore REST ${response.status} ${await response.text()}`);
    const payload = await response.json();
    for (const raw of payload.documents || []) {
      documents.push({ id: raw.name.split('/').at(-1), data: decodeFields(raw.fields || {}) });
    }
    pageToken = payload.nextPageToken || '';
  } while (pageToken);
  return documents;
}

function compareEvents(a, b) {
  const dateA = typeof a.data.date === 'string' ? a.data.date : '';
  const dateB = typeof b.data.date === 'string' ? b.data.date : '';
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  return Number(a.data.createdAt || 0) - Number(b.data.createdAt || 0);
}

function analyzeSow(sow, events) {
  const currentParity = Number(sow.data.parity);
  if (!Number.isFinite(currentParity) || currentParity < 0) {
    return { status: 'NEEDS_REVIEW', reason: 'INVALID_CURRENT_PARITY', currentParity: sow.data.parity };
  }

  const ordered = [...events].sort(compareEvents);
  const farrowCount = ordered.filter(event => event.data.type === 'FARROW').length;
  const weanCount = ordered.filter(event => event.data.type === 'WEAN').length;

  if (farrowCount < weanCount) {
    return { status: 'NEEDS_REVIEW', reason: 'WEAN_COUNT_EXCEEDS_FARROW_COUNT', currentParity, farrowCount, weanCount };
  }

  if (ordered.length === 0) {
    return currentParity === 0
      ? { status: 'ALREADY_CORRECT', reason: 'NO_EVENTS_ZERO_PARITY', currentParity, expectedParity: 0, farrowCount, weanCount }
      : { status: 'NEEDS_REVIEW', reason: 'NO_EVENT_HISTORY_FOR_NONZERO_PARITY', currentParity, farrowCount, weanCount };
  }

  const firstParityEvent = ordered.find(event => Number.isFinite(Number(event.data.parity)));
  if (!firstParityEvent) {
    return { status: 'NEEDS_REVIEW', reason: 'NO_PARITY_BASELINE_IN_EVENTS', currentParity, farrowCount, weanCount };
  }

  const baselineParity = Number(firstParityEvent.data.parity);
  if (baselineParity < 0) {
    return { status: 'NEEDS_REVIEW', reason: 'INVALID_EVENT_BASELINE', currentParity, baselineParity, farrowCount, weanCount };
  }

  const legacyExpectedParity = baselineParity + weanCount;
  const correctedExpectedParity = baselineParity + farrowCount;

  if (currentParity === correctedExpectedParity) {
    return {
      status: 'ALREADY_CORRECT',
      currentParity,
      expectedParity: correctedExpectedParity,
      baselineParity,
      farrowCount,
      weanCount,
    };
  }

  if (currentParity === legacyExpectedParity) {
    return {
      status: correctedExpectedParity === currentParity ? 'ALREADY_CORRECT' : 'CHANGE_REQUIRED',
      currentParity,
      expectedParity: correctedExpectedParity,
      legacyExpectedParity,
      baselineParity,
      farrowCount,
      weanCount,
      delta: correctedExpectedParity - currentParity,
    };
  }

  return {
    status: 'NEEDS_REVIEW',
    reason: 'CURRENT_PARITY_MATCHES_NEITHER_LEGACY_NOR_FARROW_MODEL',
    currentParity,
    expectedParity: correctedExpectedParity,
    legacyExpectedParity,
    baselineParity,
    farrowCount,
    weanCount,
  };
}

async function main() {
  const projectId = argValue('--project') || process.env.GOOGLE_CLOUD_PROJECT;
  const databaseId = argValue('--database') || process.env.FIRESTORE_DATABASE_ID || '(default)';
  const output = argValue('--output') || `sow-parity-reconciliation-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  if (!projectId) throw new Error('Missing project ID. Pass --project <id> or set GOOGLE_CLOUD_PROJECT.');

  const accessToken = getAccessToken();
  const [sows, events] = await Promise.all([
    listCollection({ projectId, databaseId, collectionId: 'sows', accessToken }),
    listCollection({ projectId, databaseId, collectionId: 'events', accessToken }),
  ]);

  const eventsBySow = new Map();
  for (const event of events) {
    const sowId = event.data.sowId;
    if (typeof sowId !== 'string') continue;
    if (!eventsBySow.has(sowId)) eventsBySow.set(sowId, []);
    eventsBySow.get(sowId).push(event);
  }

  const records = sows.map(sow => ({
    sowDocumentId: sow.id,
    sowDisplayId: sow.data.sowId || null,
    sowStatus: sow.data.status || null,
    ...analyzeSow(sow, eventsBySow.get(sow.id) || []),
  }));

  const summary = records.reduce((acc, record) => {
    acc[record.status] = (acc[record.status] || 0) + 1;
    return acc;
  }, {});

  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    databaseId,
    readOnly: true,
    rule: 'Parity increments at FARROW, not WEAN',
    summary,
    records,
  };

  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Read-only reconciliation report written to ${output}`);
  console.log('No Firestore writes were performed. NEEDS_REVIEW records must never be auto-corrected.');
}

main().catch(error => {
  console.error(`Parity dry-run failed: ${error.message}`);
  process.exitCode = 1;
});
