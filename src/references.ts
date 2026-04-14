import { readFile, writeFile } from 'node:fs/promises';
import fg from 'fast-glob';

/**
 * Default glob patterns used to search for references when the user
 * does not provide their own. Covers modern JS/TS frameworks plus
 * documentation and markup files.
 */
export const DEFAULT_REFERENCE_GLOBS = [
  '**/*.{ts,tsx,js,jsx,mjs,cjs}',
  '**/*.{json,jsonc,json5}',
  '**/*.{md,mdx}',
  '**/*.{html,htm,xhtml}',
  '**/*.{css,scss,sass,less,styl}',
  '**/*.{vue,svelte,astro}',
  '**/*.{yml,yaml,toml}',
];

/**
 * Directories always excluded from reference scanning to keep runs fast
 * and avoid corrupting generated artifacts.
 */
export const DEFAULT_IGNORE_GLOBS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.astro/**',
  '**/.svelte-kit/**',
  '**/out/**',
  '**/coverage/**',
];

export interface UpdateReferencesOptions {
  /** Original filename (e.g. "hero.png") to search for. */
  oldName: string;
  /** Replacement filename (e.g. "hero.webp"). */
  newName: string;
  /** Globs to search. Defaults to DEFAULT_REFERENCE_GLOBS. */
  globs?: string[];
  /** Additional ignore globs merged with DEFAULT_IGNORE_GLOBS. */
  ignore?: string[];
  /** Current working directory. */
  cwd: string;
  /** Preview only — do not write files. */
  dryRun: boolean;
}

export interface UpdateReferencesResult {
  /** Absolute paths of files that had at least one replacement. */
  updatedFiles: string[];
  /** Total number of replacements performed across all files. */
  totalReplacements: number;
}

/**
 * Escape a string for safe use inside a RegExp.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex that matches the filename only when it is not a
 * substring of a longer filename. We allow common URL-safe
 * separators on either side: start of line, whitespace, quotes,
 * parentheses, brackets, slashes, angle brackets, commas, colons,
 * semicolons, equals, hashes and question marks.
 *
 * Example: matches "logo.png" but NOT "big-logo.png".
 */
function buildBoundaryRegex(name: string): RegExp {
  const escaped = escapeRegex(name);
  // Characters considered a safe boundary BEFORE the filename.
  const before = `(^|[\\s"'\`(\\[<>,:;=#?/\\\\])`;
  // Characters considered a safe boundary AFTER the filename.
  const after = `(?=$|[\\s"'\`)\\]<>,:;=#?/\\\\])`;
  return new RegExp(`${before}${escaped}${after}`, 'g');
}

/**
 * Find and replace references to `oldName` with `newName` across the
 * codebase. Uses word-boundary matching to avoid replacing substrings
 * of longer filenames.
 */
export async function updateReferences(
  options: UpdateReferencesOptions,
): Promise<UpdateReferencesResult> {
  const {
    oldName,
    newName,
    globs = DEFAULT_REFERENCE_GLOBS,
    ignore = [],
    cwd,
    dryRun,
  } = options;

  const files = await fg(globs, {
    cwd,
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: [...DEFAULT_IGNORE_GLOBS, ...ignore],
  });

  const regex = buildBoundaryRegex(oldName);
  const updatedFiles: string[] = [];
  let totalReplacements = 0;

  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, 'utf8');
    } catch {
      // Binary or unreadable — skip quietly.
      continue;
    }

    // Quick prefilter: if the substring doesn't even appear, skip the regex work.
    if (!content.includes(oldName)) continue;

    let fileReplacements = 0;
    const next = content.replace(regex, (_m, pre) => {
      fileReplacements++;
      return `${pre}${newName}`;
    });

    if (fileReplacements === 0) continue;

    totalReplacements += fileReplacements;
    updatedFiles.push(file);

    if (!dryRun) {
      await writeFile(file, next, 'utf8');
    }
  }

  return { updatedFiles, totalReplacements };
}
