#!/usr/bin/env node
/**
 * scripts/check-schema-drift.mjs
 *
 * Walks every .ts / .tsx file under app/, bot/, lib/ and extracts every
 * `.from('<table>')` Supabase reference. Walks every .sql file under
 * supabase/migrations/ and extracts every `CREATE TABLE ... <table>`
 * declaration. Diffs them.
 *
 * Fails (exit 1) if any table is read/written in code but never declared
 * by a migration. Known-drift tables can be temporarily allow-listed in
 * scripts/.schema-drift-allowlist so the check is gated on the *delta*
 * — i.e. a new PR can't introduce a new drift, but the existing 14
 * historical drifts don't block CI until their backfill migrations land.
 *
 * Bringing the allowlist to empty is the goal — every entry should have
 * a corresponding follow-up issue / PR.
 *
 * Limitations (intentional, documented):
 *   - Only matches `.from('literal-string')`. Calls like `.from(tableName)`
 *     where the table is a variable are skipped, since we can't resolve
 *     them statically.
 *   - Treats `CREATE TABLE IF NOT EXISTS <name>` and bare `CREATE TABLE
 *     <name>` the same.
 *   - Schema-qualified names (`public.foo`) are normalized to bare `foo`.
 *   - Quoted identifiers ("Foo") are normalized to lower-case bare form.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

const CODE_DIRS = ['app', 'bot', 'lib'];
const CODE_EXTS = new Set(['.ts', '.tsx']);
const MIGRATIONS_DIR = join(REPO_ROOT, 'supabase', 'migrations');
const ALLOWLIST_FILE = join(REPO_ROOT, 'scripts', '.schema-drift-allowlist');

/** @returns {string[]} */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue;
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

/**
 * @param {string} file
 * @returns {Set<string>}
 */
function extractFromTables(file) {
  const src = readFileSync(file, 'utf8');
  const tables = new Set();
  // Match `.from('foo')` or `.from("foo")` — single string literal only.
  // Variable args like `.from(tableName)` are skipped on purpose.
  //
  // Variable-width lookbehind on `.storage` (with optional whitespace
  // between it and `.from(`) so we don't false-positive on
  // `supabase.storage.from('bucket-name')` — storage buckets are not
  // Postgres tables. The whitespace tolerance handles the common
  // formatter break:
  //
  //   await supabase.storage
  //     .from('uploads')
  //     .upload(...);
  //
  const re = /(?<!\.storage\s{0,200})\.from\(\s*['"]([a-zA-Z_][\w]*)['"]\s*\)/g;
  for (const m of src.matchAll(re)) {
    tables.add(m[1].toLowerCase());
  }
  return tables;
}

/**
 * @param {string} file
 * @returns {Set<string>}
 */
function extractCreatedTables(file) {
  const src = readFileSync(file, 'utf8');
  const tables = new Set();
  // Match `CREATE TABLE [IF NOT EXISTS] [schema.]name` — supports quoted
  // and unquoted identifiers.
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.|"public"\.)?["]?([a-zA-Z_][\w]*)["]?/gi;
  for (const m of src.matchAll(re)) {
    tables.add(m[1].toLowerCase());
  }
  return tables;
}

function readAllowlist() {
  if (!existsSync(ALLOWLIST_FILE)) return new Set();
  const raw = readFileSync(ALLOWLIST_FILE, 'utf8');
  const out = new Set();
  for (const line of raw.split('\n')) {
    // Strip trailing inline `#` comments before trimming.
    const noComment = line.replace(/#.*$/, '');
    const trimmed = noComment.trim();
    if (!trimmed) continue;
    out.add(trimmed.toLowerCase());
  }
  return out;
}

function main() {
  // 1) Tables referenced by code.
  const codeTables = new Set();
  for (const d of CODE_DIRS) {
    const root = join(REPO_ROOT, d);
    if (!existsSync(root)) continue;
    for (const file of walk(root)) {
      if (!CODE_EXTS.has(extname(file))) continue;
      for (const t of extractFromTables(file)) codeTables.add(t);
    }
  }

  // 2) Tables declared by migrations.
  const declaredTables = new Set();
  if (existsSync(MIGRATIONS_DIR)) {
    for (const file of walk(MIGRATIONS_DIR)) {
      if (extname(file) !== '.sql') continue;
      for (const t of extractCreatedTables(file)) declaredTables.add(t);
    }
  }

  // 3) Drift = referenced by code but never declared.
  const drift = [...codeTables].filter((t) => !declaredTables.has(t)).sort();

  // 4) Allowlist excludes known historical drifts.
  const allow = readAllowlist();
  const newDrift = drift.filter((t) => !allow.has(t));
  const obsoleteAllow = [...allow].filter((t) => declaredTables.has(t) || !codeTables.has(t));

  console.log(`scanned ${codeTables.size} table references in code`);
  console.log(`found ${declaredTables.size} CREATE TABLE declarations in supabase/migrations/`);
  console.log(`${drift.length} tables in code without a declaring migration (${allow.size} allow-listed)`);

  if (newDrift.length > 0) {
    console.error('');
    console.error('--- NEW SCHEMA DRIFT DETECTED ---');
    console.error('These tables are referenced by code but have no CREATE TABLE');
    console.error('in supabase/migrations/. Either add the migration or, if this');
    console.error('is intentional and the table is created out-of-band, add it to');
    console.error('scripts/.schema-drift-allowlist with a comment explaining why:');
    console.error('');
    for (const t of newDrift) console.error(`  - ${t}`);
    console.error('');
    process.exit(1);
  }

  if (obsoleteAllow.length > 0) {
    console.warn('');
    console.warn('--- OBSOLETE ALLOWLIST ENTRIES ---');
    console.warn('These tables are on the allowlist but either now have a migration');
    console.warn('OR are no longer referenced in code. Remove them from');
    console.warn('scripts/.schema-drift-allowlist to keep the list tight:');
    console.warn('');
    for (const t of obsoleteAllow) console.warn(`  - ${t}`);
    console.warn('');
    // Obsolete allowlist entries are a warning, not a failure — they're
    // hygiene, not correctness. Promote to error later if desired.
  }

  console.log('schema drift check: OK');
}

main();
