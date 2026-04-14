import { mkdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { convertToWebP } from '../src/index.js';
import { convertImageFile, formatBytes, formatSavings } from '../src/converter.js';

let tmp: string;

async function createTestPng(path: string, size = 64): Promise<void> {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toFile(path);
}

beforeEach(async () => {
  tmp = join(tmpdir(), `webp-me-all-conv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(join(tmp, 'public'), { recursive: true });
  await mkdir(join(tmp, 'src'), { recursive: true });
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('convertImageFile', () => {
  it('converts a PNG to WebP and returns byte sizes', async () => {
    const input = join(tmp, 'public/test.png');
    await createTestPng(input);

    const result = await convertImageFile(input, {
      quality: 80,
      lossless: false,
      effort: 4,
      dryRun: false,
      deleteOriginal: false,
    });

    expect(result.to).toContain('test.webp');
    expect(result.originalSize).toBeGreaterThan(0);
    expect(result.newSize).toBeGreaterThan(0);

    const webpStat = await stat(result.to);
    expect(webpStat.isFile()).toBe(true);

    // original should still exist because deleteOriginal: false
    const origStat = await stat(input);
    expect(origStat.isFile()).toBe(true);
  });

  it('removes the original when deleteOriginal is true', async () => {
    const input = join(tmp, 'public/test2.png');
    await createTestPng(input);

    await convertImageFile(input, {
      quality: 80,
      lossless: false,
      effort: 4,
      dryRun: false,
      deleteOriginal: true,
    });

    await expect(stat(input)).rejects.toThrow();
  });

  it('does not write to disk in dry-run mode', async () => {
    const input = join(tmp, 'public/dry.png');
    await createTestPng(input);
    const outPath = join(tmp, 'public/dry.webp');

    const result = await convertImageFile(input, {
      quality: 80,
      lossless: false,
      effort: 4,
      dryRun: true,
      deleteOriginal: false,
    });

    expect(result.newSize).toBeGreaterThan(0);
    await expect(stat(outPath)).rejects.toThrow();
  });
});

describe('formatBytes', () => {
  it('formats zero, bytes, KB, MB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
  });
});

describe('formatSavings', () => {
  it('formats savings percentage', () => {
    expect(formatSavings(100, 80)).toBe('-20.0%');
    expect(formatSavings(100, 100)).toBe('-0.0%');
    expect(formatSavings(0, 0)).toBe('0%');
  });
});

describe('convertToWebP (integration)', () => {
  it('converts images and updates references end-to-end', async () => {
    const img = join(tmp, 'public/logo.png');
    await createTestPng(img);

    const source = join(tmp, 'src/App.tsx');
    await writeFile(source, `import logo from "../public/logo.png";\n`);

    const result = await convertToWebP({
      input: 'public/**/*.png',
      cwd: tmp,
      updateReferences: true,
      deleteOriginals: false,
      dryRun: false,
    });

    expect(result.conversions).toHaveLength(1);
    expect(result.conversions[0].referencesUpdated).toBe(1);
    expect(result.totalReferencesUpdated).toBe(1);
    expect(result.totalBytesSaved).toBeGreaterThanOrEqual(0);

    const sourceAfter = await readFile(source, 'utf8');
    expect(sourceAfter).toContain('logo.webp');
  });

  it('performs a complete dry run without touching disk', async () => {
    const img = join(tmp, 'public/hero.png');
    await createTestPng(img);

    const source = join(tmp, 'src/App.tsx');
    const before = `import hero from "../public/hero.png";\n`;
    await writeFile(source, before);

    const result = await convertToWebP({
      input: 'public/**/*.png',
      cwd: tmp,
      dryRun: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.conversions[0].referencesUpdated).toBe(1);

    // File should remain untouched.
    const sourceAfter = await readFile(source, 'utf8');
    expect(sourceAfter).toBe(before);

    // WebP output should not exist on disk.
    await expect(stat(join(tmp, 'public/hero.webp'))).rejects.toThrow();
  });

  it('validates quality range', async () => {
    await expect(
      convertToWebP({ input: 'public/**/*.png', cwd: tmp, quality: 101 }),
    ).rejects.toThrow(/quality/);
  });

  it('validates effort range', async () => {
    await expect(
      convertToWebP({ input: 'public/**/*.png', cwd: tmp, effort: 7 }),
    ).rejects.toThrow(/effort/);
  });

  it('accepts array input globs', async () => {
    await createTestPng(join(tmp, 'public/a.png'));
    await createTestPng(join(tmp, 'src/b.png'));

    const result = await convertToWebP({
      input: ['public/**/*.png', 'src/**/*.png'],
      cwd: tmp,
      updateReferences: false,
      dryRun: true,
    });

    expect(result.conversions).toHaveLength(2);
  });

  it('skips files that are already .webp', async () => {
    const webp = join(tmp, 'public/already.webp');
    await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .webp()
      .toFile(webp);

    const result = await convertToWebP({
      input: 'public/**/*.webp',
      cwd: tmp,
      updateReferences: false,
      dryRun: true,
    });

    expect(result.conversions[0].skipped).toBe(true);
  });
});
