import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// ProseMirror and tiptap rely on instanceof checks across packages. If pnpm
// resolves two copies of any of them (e.g. prosemirror-view on 1.25.12 while
// prosemirror-state is on 1.25.11), the editor throws "Can not convert ... to a
// Fragment" on every keystroke and typing silently stops working. The weekly
// dependency bump is the usual way this creeps in; the root package.json
// `pnpm.overrides` keeps prosemirror-model pinned to a single version.
const DEDUPED_PACKAGES = /^(prosemirror-[a-z-]+|@tiptap\/[a-z-]+)$/;

const lockfile = readFileSync(join(__dirname, '../../../../pnpm-lock.yaml'), 'utf8');

const resolvedVersions = () => {
  const versions = new Map<string, Set<string>>();
  const packagesSection = lockfile.split(/^packages:$/m)[1]?.split(/^snapshots:$/m)[0] ?? '';
  for (const line of packagesSection.split('\n')) {
    const match = line.match(/^ {2}'?(@?[^@'\s]+)@(\d+\.\d+\.\d+[^'(:]*)'?:$/);
    if (!match) continue;
    const [, name, version] = match;
    if (!DEDUPED_PACKAGES.test(name)) continue;
    if (!versions.has(name)) versions.set(name, new Set());
    versions.get(name)!.add(version);
  }
  return versions;
};

describe('editor dependency dedupe', () => {
  const versions = resolvedVersions();

  it('finds the prosemirror and tiptap packages in the lockfile', () => {
    expect(versions.has('prosemirror-model')).toBe(true);
    expect(versions.has('prosemirror-view')).toBe(true);
    expect(versions.has('@tiptap/core')).toBe(true);
  });

  it('resolves every prosemirror-* and @tiptap/* package to exactly one version', () => {
    const duplicates = [...versions.entries()]
      .filter(([, set]) => set.size > 1)
      .map(([name, set]) => `${name}: ${[...set].join(', ')}`);
    expect(duplicates, 'run `pnpm dedupe` or fix pnpm.overrides in the root package.json').toEqual([]);
  });
});
