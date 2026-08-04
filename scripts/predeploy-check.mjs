#!/usr/bin/env node
/**
 * MyBuilderVault predeploy gate (copied from MyRealtyVault per Rule of Three). Runs before every build (npm run predeploy),
 * locally and in CI. Syntax-check every file, audit env contract and
 * migration sequence, refuse to ship on failure.
 *
 * Uses esbuild's library API directly (no subprocesses) so it behaves
 * identically on Windows, macOS, Linux, and Netlify's build image.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { transformSync } from 'esbuild';

const errors = [];

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist') continue;
      walk(p, exts, out);
    } else if (exts.includes(extname(name))) {
      out.push(p);
    }
  }
  return out;
}

// --- 1. Parse every source file (in-process esbuild) -------------------------
const sourceFiles = [
  ...walk('src', ['.js', '.jsx', '.mjs']),
  ...walk('scripts', ['.mjs', '.js']),
  ...(existsSync('netlify/functions') ? walk('netlify/functions', ['.mjs', '.js']) : []),
];
for (const file of sourceFiles) {
  try {
    transformSync(readFileSync(file, 'utf8'), { loader: 'jsx', logLevel: 'silent' });
  } catch (e) {
    const msg = e.errors?.map((x) => `${x.text} (line ${x.location?.line})`).join('; ') ?? e.message;
    errors.push(`Syntax: ${file} — ${msg}`);
  }
}

// --- 2. Env var contract -----------------------------------------------------
for (const file of walk('src', ['.js', '.jsx'])) {
  const text = readFileSync(file, 'utf8');
  const matches = text.match(/import\.meta\.env\.(\w+)/g) ?? [];
  for (const m of matches) {
    const name = m.replace('import.meta.env.', '');
    if (!name.startsWith('VITE_') && !['MODE', 'DEV', 'PROD', 'BASE_URL', 'SSR'].includes(name)) {
      errors.push(`Env: ${file} references import.meta.env.${name} — non-VITE_ vars are undefined in the client bundle.`);
    }
  }
}

// --- 3. Migration numbering --------------------------------------------------
const migrations = readdirSync('supabase/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort();
const seen = new Set();
migrations.forEach((f, i) => {
  const m = f.match(/^(\d{3})_[a-z0-9_]+\.sql$/);
  if (!m) {
    errors.push(`Migration: "${f}" does not match NNN_snake_case.sql`);
    return;
  }
  const n = Number(m[1]);
  if (seen.has(n)) errors.push(`Migration: duplicate number ${m[1]} (${f})`);
  seen.add(n);
  if (n !== i + 1) errors.push(`Migration: "${f}" breaks the sequence — expected ${String(i + 1).padStart(3, '0')}.`);
});

// --- Report ------------------------------------------------------------------
if (errors.length) {
  console.error(`\nPredeploy gate FAILED — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error('  • ' + e.replace(/\n/g, '\n    '));
  console.error('');
  process.exit(1);
}
console.log(`Predeploy gate passed: ${sourceFiles.length} source files parsed, env contract clean, ${migrations.length} migration(s) in sequence.`);
