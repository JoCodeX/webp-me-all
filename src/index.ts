import { basename } from 'node:path';
import fg from 'fast-glob';

import { convertImageFile } from './converter.js';
import { DEFAULT_IGNORE_GLOBS, updateReferences } from './references.js';
import type {
  ConversionEntry,
  ConvertOptions,
  ConvertResult,
  ProgressEvent,
} from './types.js';

export type {
  ConversionEntry,
  ConvertOptions,
  ConvertResult,
  ProgressEvent,
  SupportedFormat,
} from './types.js';

export {
  DEFAULT_REFERENCE_GLOBS,
  DEFAULT_IGNORE_GLOBS,
  updateReferences,
} from './references.js';

export { convertImageFile, formatBytes, formatSavings } from './converter.js';

/**
 * Convert images to WebP and optionally update references to them
 * across your codebase.
 *
 * @example
 * ```ts
 * import { convertToWebP } from 'webp-me-all';
 *
 * const result = await convertToWebP({
 *   input: 'public/**\/*.{png,jpg,jpeg}',
 *   quality: 80,
 *   updateReferences: true,
 *   dryRun: false,
 * });
 *
 * console.log(`Saved ${result.totalBytesSaved} bytes across ${result.conversions.length} files`);
 * ```
 */
export async function convertToWebP(options: ConvertOptions): Promise<ConvertResult> {
  const {
    input,
    quality = 80,
    lossless = false,
    effort = 4,
    updateReferences: shouldUpdateRefs = true,
    referenceGlobs,
    deleteOriginals = false,
    dryRun = false,
    cwd = process.cwd(),
    onProgress,
    onComplete,
  } = options;

  const start = Date.now();

  if (quality < 1 || quality > 100) {
    throw new Error(`quality must be between 1 and 100 (got ${quality})`);
  }
  if (effort < 0 || effort > 6) {
    throw new Error(`effort must be between 0 and 6 (got ${effort})`);
  }

  const inputGlobs = Array.isArray(input) ? input : [input];

  const images = await fg(inputGlobs, {
    cwd,
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: DEFAULT_IGNORE_GLOBS,
  });

  const conversions: ConversionEntry[] = [];
  let totalBytesSaved = 0;
  let totalReferencesUpdated = 0;

  for (let i = 0; i < images.length; i++) {
    const filePath = images[i];
    const entry: ConversionEntry = {
      from: filePath,
      to: '',
      originalSize: 0,
      newSize: 0,
      referencesUpdated: 0,
      referenceFiles: [],
    };

    try {
      // Skip if already WebP.
      if (filePath.toLowerCase().endsWith('.webp')) {
        entry.skipped = true;
        entry.to = filePath;
        conversions.push(entry);
        continue;
      }

      const converted = await convertImageFile(filePath, {
        quality,
        lossless,
        effort,
        dryRun,
        deleteOriginal: deleteOriginals && !dryRun,
      });

      entry.to = converted.to;
      entry.originalSize = converted.originalSize;
      entry.newSize = converted.newSize;
      totalBytesSaved += converted.originalSize - converted.newSize;

      if (shouldUpdateRefs) {
        const oldName = basename(converted.from);
        const newName = basename(converted.to);
        const refResult = await updateReferences({
          oldName,
          newName,
          globs: referenceGlobs,
          cwd,
          dryRun,
        });
        entry.referencesUpdated = refResult.totalReplacements;
        entry.referenceFiles = refResult.updatedFiles;
        totalReferencesUpdated += refResult.totalReplacements;
      }
    } catch (err) {
      entry.error = err instanceof Error ? err.message : String(err);
    }

    conversions.push(entry);

    if (onProgress) {
      const event: ProgressEvent = {
        from: entry.from,
        to: entry.to,
        originalSize: entry.originalSize,
        newSize: entry.newSize,
        referencesUpdated: entry.referencesUpdated,
        current: i + 1,
        total: images.length,
      };
      onProgress(event);
    }
  }

  const result: ConvertResult = {
    conversions,
    totalBytesSaved,
    totalReferencesUpdated,
    dryRun,
    durationMs: Date.now() - start,
  };

  if (onComplete) onComplete(result);

  return result;
}

// Default export for convenience.
export default convertToWebP;
