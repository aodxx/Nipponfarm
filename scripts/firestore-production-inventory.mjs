#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const DEFAULT_COLLECTIONS = [
  'users',
  'sows',
  'events',
  'tasks',
  'pig_sales',
  'maintenance_requests',
  'chat_rooms',
  'chat_messages',
  'employee_transactions',
  'EmployeeTransaction',
  'employee_salaries',
  'payroll_slips',
  'salary_advances',
  'payroll_audit_events',
  'bills',
  'bill_items',
  'feed_recipes',
  'pig_prices',
  'historical_pig_prices',
  'farm_settings',
  'master_ingredients',
  'news_posts',
  'manuals',
];

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getAccessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  try {
    return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  } catch {
    throw new Error(
      'No Google OAuth access token available. Set GOOGLE_OAUTH_ACCESS_TOKEN or run `gcloud auth login` first.',
    );
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
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('bytesValue' in value) return '[bytes]';
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decodeFirestoreValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields || {});
  return '[unknown]';
}

function decodeFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeFirestoreValue(value)]));
}

function signatureOf(document) {
  return Object.keys(document).sort().join('|');
}

async function listCollection({ projectId, databaseId, collectionId, accessToken }) {
  const documents = [];
  let pageToken = '';

  do {
    const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(databaseId)}/documents/${encodeURIComponent(collectionId)}`;
    const url = new URL(base);
    url.searchParams.set('pageSize', '1000');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 404) return [];
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`${collectionId}: Firestore REST ${response.status} ${body}`);
    }

    const payload = await response.json();
    for (const raw of payload.documents || []) {
      documents.push({
        id: raw.name.split('/').at(-1),
        createTime: raw.createTime || null,
        updateTime: raw.updateTime || null,
        data: decodeFields(raw.fields || {}),
      });
    }
    pageToken = payload.nextPageToken || '';
  } while (pageToken);

  return documents;
}

function summarizeCollection(documents) {
  const signatures = new Map();
  for (const document of documents) {
    const signature = signatureOf(document.data);
    signatures.set(signature, (signatures.get(signature) || 0) + 1);
  }

  return {
    count: documents.length,
    schemaVariants: [...signatures.entries()]
      .map(([fields, count]) => ({ count, fields: fields ? fields.split('|') : [] }))
      .sort((a, b) => b.count - a.count),
  };
}

async function main() {
  const projectId = argValue('--project') || process.env.GOOGLE_CLOUD_PROJECT;
  const databaseId = argValue('--database') || '(default)';
  const output = argValue('--output') || `firestore-inventory-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const exportJson = process.argv.includes('--include-documents');
  const collectionArg = argValue('--collections');
  const collections = collectionArg
    ? collectionArg.split(',').map((value) => value.trim()).filter(Boolean)
    : DEFAULT_COLLECTIONS;

  if (!projectId) {
    throw new Error('Missing project ID. Pass --project <id> or set GOOGLE_CLOUD_PROJECT.');
  }

  const accessToken = getAccessToken();
  const report = {
    generatedAt: new Date().toISOString(),
    projectId,
    databaseId,
    mode: exportJson ? 'inventory+logical-export' : 'inventory-only',
    readOnly: true,
    collections: {},
  };

  for (const collectionId of collections) {
    process.stdout.write(`Reading ${collectionId}... `);
    const documents = await listCollection({ projectId, databaseId, collectionId, accessToken });
    const summary = summarizeCollection(documents);
    report.collections[collectionId] = exportJson
      ? { ...summary, documents }
      : summary;
    console.log(`${summary.count} docs, ${summary.schemaVariants.length} schema variant(s)`);
  }

  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`\nRead-only report written to ${output}`);
  console.log('No Firestore writes were performed. Review the report before any migration.');
}

main().catch((error) => {
  console.error(`Inventory failed: ${error.message}`);
  process.exitCode = 1;
});
