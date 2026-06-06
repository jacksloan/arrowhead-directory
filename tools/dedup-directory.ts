import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve('src/data/directory.json');
const raw = readFileSync(filePath, 'utf-8');
const businesses: Record<string, unknown>[] = JSON.parse(raw);

const seen = new Map<string, Record<string, unknown>>();
const dupes: string[] = [];

for (const biz of businesses) {
  const name = biz.name as string;
  if (seen.has(name)) {
    dupes.push(name);
    const existing = seen.get(name)!;
    const merged = Array.from(
      new Set([
        ...((existing.subcategories as string[]) ?? []),
        ...((biz.subcategories as string[]) ?? []),
      ])
    );
    existing.subcategories = merged;
  } else {
    seen.set(name, { ...biz });
  }
}

const deduped = Array.from(seen.values());

if (dupes.length === 0) {
  console.log('No duplicates found.');
} else {
  console.log(`Merged ${dupes.length} duplicate(s):`);
  for (const name of dupes) console.log(`  - ${name}`);
}

console.log(`Before: ${businesses.length} records`);
console.log(`After:  ${deduped.length} records`);

writeFileSync(filePath, JSON.stringify(deduped, null, 2) + '\n');
console.log(`Written to ${filePath}`);
