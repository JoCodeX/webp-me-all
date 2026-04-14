import { Command } from 'commander';
import kleur from 'kleur';

import { convertToWebP } from './index.js';
import { formatBytes, formatSavings } from './converter.js';

const DEFAULT_INPUT = '**/*.{png,jpg,jpeg,tiff,gif,avif}';

interface CliOptions {
  quality: string;
  effort: string;
  lossless: boolean;
  updateRefs: boolean;
  refGlob?: string[];
  deleteOriginals: boolean;
  dryRun: boolean;
  cwd?: string;
  silent: boolean;
  json: boolean;
}

function createProgram(): Command {
  const program = new Command();

  program
    .name('webp-me-all')
    .description(
      'Convert images to WebP and automatically update every reference in your codebase.',
    )
    .version(process.env.npm_package_version ?? '0.0.0')
    .argument(
      '[patterns...]',
      'Glob pattern(s) for images to convert',
      [DEFAULT_INPUT],
    )
    .option('-q, --quality <n>', 'WebP quality 1-100', '80')
    .option('-e, --effort <n>', 'CPU effort 0-6 (higher = smaller files, slower)', '4')
    .option('--lossless', 'Use lossless WebP compression', false)
    .option('--no-update-refs', 'Do NOT update references in your codebase')
    .option(
      '-r, --ref-glob <pattern>',
      'Glob(s) for files to scan for references (repeatable). Defaults cover TS/JS/JSON/MD/HTML/CSS.',
      collect,
      undefined,
    )
    .option(
      '--delete-originals',
      'Delete the original image files after a successful conversion',
      false,
    )
    .option('-d, --dry-run', 'Preview changes without writing anything to disk', false)
    .option('-C, --cwd <dir>', 'Working directory', process.cwd())
    .option('-s, --silent', 'Suppress all output except errors', false)
    .option('--json', 'Emit the final result as JSON (useful in CI)', false);

  return program;
}

function collect(value: string, previous: string[] | undefined): string[] {
  return previous ? [...previous, value] : [value];
}

export async function run(argv: string[] = process.argv): Promise<number> {
  const program = createProgram();
  program.exitOverride();

  try {
    await program.parseAsync(argv);
  } catch (err: unknown) {
    // Commander exit with --help or --version throws a CommanderError.
    const code = (err as { exitCode?: number }).exitCode ?? 1;
    return code;
  }

  const patterns = program.args.length > 0 ? program.args : [DEFAULT_INPUT];
  const opts = program.opts<CliOptions>();

  const quality = Number(opts.quality);
  const effort = Number(opts.effort);

  if (Number.isNaN(quality) || Number.isNaN(effort)) {
    console.error(kleur.red('Error: --quality and --effort must be numbers'));
    return 2;
  }

  const log = (fn: (s: string) => void, s: string) => {
    if (!opts.silent && !opts.json) fn(s);
  };

  log(console.log, kleur.bold().cyan('webp-me-all'));
  log(console.log, kleur.dim(`patterns: ${patterns.join(', ')}`));
  if (opts.dryRun) {
    log(console.log, kleur.yellow('DRY RUN — no files will be written'));
  }

  const result = await convertToWebP({
    input: patterns,
    quality,
    effort,
    lossless: opts.lossless,
    updateReferences: opts.updateRefs,
    referenceGlobs: opts.refGlob,
    deleteOriginals: opts.deleteOriginals,
    dryRun: opts.dryRun,
    cwd: opts.cwd,
    onProgress: (event) => {
      if (opts.silent || opts.json) return;
      const short = event.from.replace(`${opts.cwd}/`, '');
      const sizeFrom = formatBytes(event.originalSize);
      const sizeTo = formatBytes(event.newSize);
      const savings = formatSavings(event.originalSize, event.newSize);
      const refs = event.referencesUpdated > 0
        ? kleur.dim(` (${event.referencesUpdated} refs)`)
        : '';
      console.log(
        `${kleur.green('✓')} [${event.current}/${event.total}] ${short} ` +
          `${kleur.dim(`${sizeFrom} → ${sizeTo}`)} ${kleur.cyan(savings)}${refs}`,
      );
    },
  });

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return result.conversions.some((c) => c.error) ? 1 : 0;
  }

  if (opts.silent) {
    return result.conversions.some((c) => c.error) ? 1 : 0;
  }

  const successes = result.conversions.filter((c) => !c.error && !c.skipped);
  const errors = result.conversions.filter((c) => c.error);
  const skipped = result.conversions.filter((c) => c.skipped);

  console.log('');
  console.log(kleur.bold('Summary'));
  console.log(`  Converted:  ${kleur.green(String(successes.length))}`);
  if (skipped.length) {
    console.log(`  Skipped:    ${kleur.yellow(String(skipped.length))}`);
  }
  if (errors.length) {
    console.log(`  Errors:     ${kleur.red(String(errors.length))}`);
  }
  console.log(`  Saved:      ${kleur.cyan(formatBytes(result.totalBytesSaved))}`);
  console.log(`  References: ${kleur.cyan(String(result.totalReferencesUpdated))} updates`);
  console.log(`  Time:       ${kleur.dim(`${result.durationMs}ms`)}`);

  if (errors.length > 0) {
    console.log('');
    console.log(kleur.red().bold('Errors:'));
    for (const entry of errors) {
      console.log(`  ${kleur.red('✗')} ${entry.from}: ${entry.error}`);
    }
    return 1;
  }

  return 0;
}

// Allow running directly.
if (import.meta.url === `file://${process.argv[1]}`) {
  run().then((code) => process.exit(code));
}
