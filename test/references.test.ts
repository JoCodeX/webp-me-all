import { mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { updateReferences } from '../src/references.js';

let tmp: string;

beforeEach(async () => {
  tmp = join(tmpdir(), `webp-me-all-refs-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(tmp, { recursive: true });
  await mkdir(join(tmp, 'src'), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('updateReferences', () => {
  it('replaces a reference inside a quoted import', async () => {
    const file = join(tmp, 'src/App.tsx');
    await writeFile(file, `import hero from "./hero.png";\nexport default hero;\n`);

    const result = await updateReferences({
      oldName: 'hero.png',
      newName: 'hero.webp',
      cwd: tmp,
      dryRun: false,
    });

    expect(result.totalReplacements).toBe(1);
    expect(result.updatedFiles).toHaveLength(1);
    const after = await readFile(file, 'utf8');
    expect(after).toContain('./hero.webp');
    expect(after).not.toContain('hero.png');
  });

  it('does not replace when the filename is a substring of another', async () => {
    const file = join(tmp, 'src/App.tsx');
    await writeFile(file, `const a = "big-hero.png";\nconst b = "hero.png";\n`);

    const result = await updateReferences({
      oldName: 'hero.png',
      newName: 'hero.webp',
      cwd: tmp,
      dryRun: false,
    });

    expect(result.totalReplacements).toBe(1);
    const after = await readFile(file, 'utf8');
    expect(after).toContain('big-hero.png');
    expect(after).toContain('hero.webp');
  });

  it('respects dry-run and does not write files', async () => {
    const file = join(tmp, 'src/App.tsx');
    const original = `const src = "logo.png";\n`;
    await writeFile(file, original);

    const result = await updateReferences({
      oldName: 'logo.png',
      newName: 'logo.webp',
      cwd: tmp,
      dryRun: true,
    });

    expect(result.totalReplacements).toBe(1);
    const after = await readFile(file, 'utf8');
    expect(after).toBe(original);
  });

  it('handles multiple replacements in a single file', async () => {
    const file = join(tmp, 'src/Gallery.tsx');
    await writeFile(
      file,
      `<img src="photo.jpg" />\n<img src="photo.jpg" alt="other" />\n`,
    );

    const result = await updateReferences({
      oldName: 'photo.jpg',
      newName: 'photo.webp',
      cwd: tmp,
      dryRun: false,
    });

    expect(result.totalReplacements).toBe(2);
    const after = await readFile(file, 'utf8');
    expect((after.match(/photo\.webp/g) ?? []).length).toBe(2);
  });

  it('ignores node_modules and dist by default', async () => {
    const nm = join(tmp, 'node_modules/some-pkg');
    await mkdir(nm, { recursive: true });
    await writeFile(join(nm, 'index.js'), `require("./logo.png");\n`);

    const source = join(tmp, 'src/App.tsx');
    await writeFile(source, `import logo from "./logo.png";\n`);

    const result = await updateReferences({
      oldName: 'logo.png',
      newName: 'logo.webp',
      cwd: tmp,
      dryRun: false,
    });

    expect(result.totalReplacements).toBe(1);
    const nmContent = await readFile(join(nm, 'index.js'), 'utf8');
    expect(nmContent).toContain('logo.png');
  });

  it('updates references across many file types (json, md, css)', async () => {
    await writeFile(
      join(tmp, 'src/config.json'),
      `{"icon": "icon.png"}\n`,
    );
    await writeFile(
      join(tmp, 'src/README.md'),
      `![icon](./icon.png)\n`,
    );
    await writeFile(
      join(tmp, 'src/styles.css'),
      `.icon { background: url("icon.png"); }\n`,
    );

    const result = await updateReferences({
      oldName: 'icon.png',
      newName: 'icon.webp',
      cwd: tmp,
      dryRun: false,
    });

    expect(result.totalReplacements).toBe(3);
    expect(result.updatedFiles).toHaveLength(3);
  });

  it('short-circuits when no files contain the string', async () => {
    await writeFile(join(tmp, 'src/App.tsx'), `console.log("hello");\n`);

    const result = await updateReferences({
      oldName: 'missing.png',
      newName: 'missing.webp',
      cwd: tmp,
      dryRun: false,
    });

    expect(result.totalReplacements).toBe(0);
    expect(result.updatedFiles).toHaveLength(0);
  });
});
