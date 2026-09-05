#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

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

async function apiGet(url, accessToken) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Firebase Rules API ${response.status}: ${body}`);
  }
  return response.json();
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').trimEnd() + '\n';
}

async function listReleases(projectId, accessToken) {
  const releases = [];
  let pageToken = '';
  do {
    const url = new URL(`https://firebaserules.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/releases`);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const payload = await apiGet(url, accessToken);
    releases.push(...(payload.releases || []));
    pageToken = payload.nextPageToken || '';
  } while (pageToken);
  return releases;
}

async function getRuleset(rulesetName, accessToken) {
  return apiGet(`https://firebaserules.googleapis.com/v1/${rulesetName}`, accessToken);
}

function findRelease(releases, kind) {
  if (kind === 'firestore') {
    return releases.find((release) => release.name?.endsWith('/releases/cloud.firestore')) || null;
  }

  const storageReleases = releases.filter((release) => release.name?.includes('/releases/firebase.storage'));
  if (storageReleases.length === 1) return storageReleases[0];
  if (storageReleases.length > 1) {
    throw new Error(
      `Found multiple Firebase Storage releases (${storageReleases.map((item) => item.name).join(', ')}). ` +
      'Use Firebase Console/CLI to confirm the production bucket before comparison.',
    );
  }
  return null;
}

function chooseRulesFile(ruleset, preferredName) {
  const files = ruleset.source?.files || [];
  return files.find((file) => file.name === preferredName)
    || files.find((file) => file.name?.endsWith(`/${preferredName}`))
    || (files.length === 1 ? files[0] : null);
}

async function compareRelease({ label, release, preferredName, localPath, accessToken }) {
  if (!release?.rulesetName) {
    return {
      label,
      status: 'MISSING_RELEASE',
      releaseName: release?.name || null,
      rulesetName: release?.rulesetName || null,
    };
  }

  const ruleset = await getRuleset(release.rulesetName, accessToken);
  const deployedFile = chooseRulesFile(ruleset, preferredName);
  if (!deployedFile || typeof deployedFile.content !== 'string') {
    return {
      label,
      status: 'MISSING_SOURCE_FILE',
      releaseName: release.name,
      rulesetName: release.rulesetName,
      deployedFileNames: (ruleset.source?.files || []).map((file) => file.name),
    };
  }

  const local = normalizeText(readFileSync(localPath, 'utf8'));
  const deployed = normalizeText(deployedFile.content);

  return {
    label,
    status: local === deployed ? 'MATCH' : 'MISMATCH',
    releaseName: release.name,
    rulesetName: release.rulesetName,
    deployedFileName: deployedFile.name,
    localPath,
    localSha256: sha256(local),
    deployedSha256: sha256(deployed),
    releaseUpdateTime: release.updateTime || null,
    rulesetCreateTime: ruleset.createTime || null,
  };
}

async function main() {
  const projectId = argValue('--project') || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('Missing project ID. Pass --project <id> or set GOOGLE_CLOUD_PROJECT.');
  }

  const accessToken = getAccessToken();
  const releases = await listReleases(projectId, accessToken);

  const firestoreRelease = findRelease(releases, 'firestore');
  const storageRelease = findRelease(releases, 'storage');

  const results = [
    await compareRelease({
      label: 'Firestore',
      release: firestoreRelease,
      preferredName: 'firestore.rules',
      localPath: 'firestore.rules',
      accessToken,
    }),
    await compareRelease({
      label: 'Storage',
      release: storageRelease,
      preferredName: 'storage.rules',
      localPath: 'storage.rules',
      accessToken,
    }),
  ];

  console.log(JSON.stringify({
    verifiedAt: new Date().toISOString(),
    projectId,
    readOnly: true,
    results,
  }, null, 2));

  const failures = results.filter((result) => result.status !== 'MATCH');
  if (failures.length > 0) {
    console.error('\nProduction rules do not fully match the repository. Do not start Wave 1 migrations yet.');
    process.exitCode = 2;
    return;
  }

  console.log('\nProduction Firestore and Storage rules match repository sources.');
}

main().catch((error) => {
  console.error(`Verification failed: ${error.message}`);
  process.exitCode = 1;
});
