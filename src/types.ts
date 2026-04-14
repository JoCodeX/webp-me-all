/**
 * Supported input image formats.
 */
export type SupportedFormat = 'png' | 'jpg' | 'jpeg' | 'tiff' | 'gif' | 'avif';

/**
 * Options for the convertToWebP function.
 */
export interface ConvertOptions {
  /**
   * Glob pattern(s) for images to convert.
   * Examples: 'public/**\/*.{png,jpg,jpeg}', ['src/assets/*.png', 'public/**\/*.jpg']
   */
  input: string | string[];

  /**
   * WebP quality (1-100). Default: 80.
   * Lower values = smaller files, lower quality.
   */
  quality?: number;

  /**
   * Use lossless compression. Default: false.
   * Overrides quality when true.
   */
  lossless?: boolean;

  /**
   * CPU effort for encoding (0-6). Default: 4.
   * Higher = slower but smaller files.
   */
  effort?: number;

  /**
   * Whether to search for and update references to the original
   * image filenames across your codebase. Default: true.
   */
  updateReferences?: boolean;

  /**
   * Glob pattern(s) for files to search for references.
   * Default: scans common source directories with text file extensions.
   */
  referenceGlobs?: string[];

  /**
   * Delete original image files after successful conversion.
   * Default: false (SAFE — keeps originals).
   */
  deleteOriginals?: boolean;

  /**
   * Preview what would happen without making any changes.
   * Default: false.
   */
  dryRun?: boolean;

  /**
   * Current working directory. Default: process.cwd().
   */
  cwd?: string;

  /**
   * Callback invoked for each converted image.
   */
  onProgress?: (event: ProgressEvent) => void;

  /**
   * Callback invoked when the conversion finishes.
   */
  onComplete?: (result: ConvertResult) => void;
}

/**
 * Event fired during conversion progress.
 */
export interface ProgressEvent {
  /** Absolute path to the source image. */
  from: string;
  /** Absolute path to the generated WebP file. */
  to: string;
  /** Size of the original file in bytes. */
  originalSize: number;
  /** Size of the new WebP file in bytes. */
  newSize: number;
  /** How many files had references updated. */
  referencesUpdated: number;
  /** Current file index (1-based). */
  current: number;
  /** Total number of files to convert. */
  total: number;
}

/**
 * Per-file conversion result.
 */
export interface ConversionEntry {
  from: string;
  to: string;
  originalSize: number;
  newSize: number;
  referencesUpdated: number;
  referenceFiles: string[];
  skipped?: boolean;
  error?: string;
}

/**
 * Aggregated result of a conversion run.
 */
export interface ConvertResult {
  /** Each file processed (successful or not). */
  conversions: ConversionEntry[];
  /** Total bytes saved across all conversions. */
  totalBytesSaved: number;
  /** Total number of reference updates applied. */
  totalReferencesUpdated: number;
  /** Whether this was a dry run. */
  dryRun: boolean;
  /** Execution time in milliseconds. */
  durationMs: number;
}
