import { access, stat, unlink } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import sharp from 'sharp';

export interface ConvertImageOptions {
  quality: number;
  lossless: boolean;
  effort: number;
  dryRun: boolean;
  deleteOriginal: boolean;
}

export interface ConvertImageResult {
  from: string;
  to: string;
  originalSize: number;
  newSize: number;
}

/**
 * Convert a single image to WebP.
 * Returns the output path and byte sizes. Honors dry-run (no disk writes).
 */
export async function convertImageFile(
  filePath: string,
  opts: ConvertImageOptions,
): Promise<ConvertImageResult> {
  const ext = extname(filePath);
  const base = basename(filePath, ext);
  const outPath = join(dirname(filePath), `${base}.webp`);

  const originalStat = await stat(filePath);
  const originalSize = originalStat.size;

  // Check if output already exists (skip in dry-run since we won't write).
  if (!opts.dryRun) {
    try {
      await access(outPath);
      throw new Error(`Output file already exists: ${outPath}`);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  if (opts.dryRun) {
    // Compute an estimated size from the input to make dry runs useful.
    // We still call sharp but write to buffer only.
    const buffer = await sharp(filePath)
      .webp({
        quality: opts.quality,
        lossless: opts.lossless,
        effort: opts.effort,
      })
      .toBuffer();

    return {
      from: filePath,
      to: outPath,
      originalSize,
      newSize: buffer.length,
    };
  }

  await sharp(filePath)
    .webp({
      quality: opts.quality,
      lossless: opts.lossless,
      effort: opts.effort,
    })
    .toFile(outPath);

  const newStat = await stat(outPath);

  if (opts.deleteOriginal) {
    await unlink(filePath);
  }

  return {
    from: filePath,
    to: outPath,
    originalSize,
    newSize: newStat.size,
  };
}

/**
 * Format bytes as a human-readable string.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

/**
 * Format a savings percentage.
 */
export function formatSavings(original: number, next: number): string {
  if (original === 0) return '0%';
  const saved = ((original - next) / original) * 100;
  const sign = saved >= 0 ? '-' : '+';
  return `${sign}${Math.abs(saved).toFixed(1)}%`;
}
