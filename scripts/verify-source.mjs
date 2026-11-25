#!/usr/bin/env node
/** Dependency-light source integrity checks for Product OS 2.0. */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = process.cwd();
const require = createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); }
catch {
  console.error('TypeScript is not installed. Run npm ci before source verification.');
  process.exit(2);
}

const ignored = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', '.turbo']);
const failures = [];
const warnings = [];
const counts = { typescript: 0, json: 0, migrations: 0 };
function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (e) { failures.push(`Cannot read ${dir}: ${e.message}`); return; }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) inspect(full);
  }
}
function inspect(file) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  if (file.endsWith('.json')) {
    try { JSON.parse(fs.readFileSync(file, 'utf8')); counts.json++; }
    catch (e) { failures.push(`Invalid JSON ${rel}: ${e.message}`); }
  }
  if (/\.(ts|tsx)$/.test(file) && !file.endsWith('.d.ts')) {
    const source = fs.readFileSync(file, 'utf8');
    const result = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
    if (errors.length) {
      for (const d of errors) failures.push(`${rel}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`);
    }
    counts.typescript++;
  }
}
for (const required of ['src', 'apps/web', 'prisma/migrations']) {
  if (!fs.existsSync(path.join(root, required))) failures.push(`Required project path missing: ${required}`);
}
walk(root);

// Keep application and lockfile versions aligned so clean installs are predictable.
try {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const web = JSON.parse(fs.readFileSync(path.join(root, 'apps/web/package.json'), 'utf8'));
  if (app.version !== lock.version || app.version !== lock.packages?.['']?.version || app.version !== web.version) {
    failures.push(`Version mismatch: root=${app.version}, lock=${lock.version}/${lock.packages?.['']?.version}, web=${web.version}`);
  }
} catch (e) { failures.push(`Unable to verify package version alignment: ${e.message}`); }

const migrationsDir = path.join(root, 'prisma', 'migrations');
if (fs.existsSync(migrationsDir)) {
  const dirs = fs.readdirSync(migrationsDir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();
  const duplicates = new Map();
  for (const name of dirs) {
    counts.migrations++;
    const sql = path.join(migrationsDir, name, 'migration.sql');
    if (!fs.existsSync(sql)) failures.push(`Migration has no migration.sql: ${name}`);
    const prefix = name.match(/^\d{14}/)?.[0];
    if (prefix) duplicates.set(prefix, [...(duplicates.get(prefix) || []), name]);
  }
  for (const [prefix, names] of duplicates) if (names.length > 1) warnings.push(`Shared migration timestamp ${prefix}: ${names.join(', ')}. Prisma orders these lexicographically; verify intended dependency order.`);
}

console.log(`Product OS source verification — ${new Date().toISOString()}`);
console.log(`TypeScript/TSX checked: ${counts.typescript}`);
console.log(`JSON files parsed: ${counts.json}`);
console.log(`Prisma migration folders: ${counts.migrations}`);
for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const failure of failures) console.error(`FAIL: ${failure}`);
if (failures.length) process.exit(1);
console.log('PASS: source syntax, JSON and migration-file integrity checks completed.');
console.log('NOTE: this does not replace semantic typechecking, tests, Prisma validation or production builds.');
