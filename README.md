# 🖼️ webp-me-all

> Convert all your images to WebP **and automatically update every reference** across your codebase — TS, TSX, JSX, JSON, MD, HTML, CSS, Vue, Svelte, Astro. The missing WebP migration tool for Next.js, Astro, Vite, Remix, Nuxt and SvelteKit.

[![npm version](https://img.shields.io/npm/v/webp-me-all.svg?style=flat-square)](https://www.npmjs.com/package/webp-me-all)
[![npm downloads](https://img.shields.io/npm/dw/webp-me-all.svg?style=flat-square)](https://www.npmjs.com/package/webp-me-all)
[![CI](https://img.shields.io/github/actions/workflow/status/JoCodeX/webp-me-all/ci.yml?branch=main&style=flat-square)](https://github.com/JoCodeX/webp-me-all/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg?style=flat-square)](./dist/index.d.ts)

## ⚡ One command. Whole project migrated.

```bash
npx webp-me-all "public/**/*.{png,jpg,jpeg}" --delete-originals
```

That's it. Every image converted, every reference in your code updated.

## ✨ Features

- 🚀 **One command, full migration** — convert images and rewrite every reference in a single pass.
- 🧠 **Framework-aware** — understands TS, TSX, JSX, JSON, MD, MDX, HTML, CSS, Vue, Svelte, Astro and YAML.
- 🛡️ **Safe by default** — word-boundary matching, originals kept, `--dry-run` preview.
- ⚡ **Fast** — powered by [`sharp`](https://sharp.pixelplumbing.com/) and `fast-glob`.
- 🧪 **CI-friendly** — JSON output for automated pipelines.
- 📦 **Zero config** — sensible defaults; override anything you need.
- 🪶 **TypeScript-native** — typed programmatic API.

## 📚 Table of contents

- [The problem](#the-problem)
- [Comparison with alternatives](#comparison-with-alternatives)
- [Install](#install)
- [Quick start](#quick-start)
- [Framework guides](#framework-guides) — Next.js, Astro, Vite, Remix, Nuxt, SvelteKit
- [Options](#options)
- [FAQ](#faq)

## The problem

You want to migrate your project to WebP for performance. Every existing tool only does half the job:

- `imagemin-webp`, `sharp`, `@squoosh/lib` → convert images, but leave your codebase full of broken references to `.png` and `.jpg`.
- `webpify` → updates references, but only in HTML and CSS. Useless for modern React, Next, Astro, Remix, Svelte, or Vue projects.

You end up writing a custom script (we've all done it). **webp-me-all** is that script, done right.

## Comparison with alternatives

| Tool            | Converts to WebP |                     Updates code references                      | Framework-aware (TSX/Vue/Svelte/Astro) | Dry-run preview | CLI + programmatic API |
| --------------- | :--------------: | :--------------------------------------------------------------: | :------------------------------------: | :-------------: | :--------------------: |
| **webp-me-all** |        ✅        | ✅ (TS, TSX, JSX, JSON, MD, HTML, CSS, Vue, Svelte, Astro, YAML) |                   ✅                   |       ✅        |           ✅           |
| `imagemin-webp` |        ✅        |                                ❌                                |                   ❌                   |       ❌        |        API only        |
| `sharp`         |        ✅        |                                ❌                                |                   ❌                   |       ❌        |        API only        |
| `@squoosh/lib`  |        ✅        |                                ❌                                |                   ❌                   |       ❌        |        API only        |
| `webpify`       |        ✅        |                         HTML + CSS only                          |                   ❌                   |       ❌        |        CLI only        |

If you only need to convert pixels, use `sharp`. If you need to migrate an entire codebase to WebP in one shot, use **webp-me-all**.

## What it does

```bash
npx webp-me-all "public/**/*.{png,jpg,jpeg}" --dry-run
```

1. Finds every matching image.
2. Converts each to WebP with configurable quality, effort, and lossless options.
3. Scans your **entire codebase** (TS, TSX, JSX, JSON, MD, MDX, HTML, CSS, Vue, Svelte, Astro, YAML) and updates every reference.
4. Uses safe word-boundary matching: `logo.png` → `logo.webp`, without accidentally rewriting `big-logo.png`.
5. Optionally deletes originals once conversion succeeds.
6. Ships a `--dry-run` flag so you can preview every change before anything hits disk.

## Install

```bash
# One-off (recommended for first use)
npx webp-me-all --help

# Install locally
npm install --save-dev webp-me-all

# Install globally
npm install -g webp-me-all
```

## Quick start

### CLI

```bash
# Dry-run (always start here)
npx webp-me-all "public/**/*.{png,jpg,jpeg}" --dry-run

# Real run — keeps originals by default (safe)
npx webp-me-all "public/**/*.{png,jpg,jpeg}" --quality 80

# Full migration: convert, update refs, delete originals
npx webp-me-all "public/**/*.{png,jpg,jpeg}" --delete-originals

# Limit where references are scanned
npx webp-me-all "public/**/*.png" --ref-glob "src/**/*.{ts,tsx}" --ref-glob "content/**/*.md"

# Emit JSON (great for CI)
npx webp-me-all "public/**/*.png" --dry-run --json
```

### Programmatic API

```ts
import { convertToWebP } from "webp-me-all";

const result = await convertToWebP({
  input: "public/**/*.{png,jpg,jpeg}",
  quality: 80,
  lossless: false,
  effort: 4,
  updateReferences: true,
  deleteOriginals: false,
  dryRun: false,
  onProgress(event) {
    console.log(`[${event.current}/${event.total}] ${event.from}`);
  },
});

console.log(`Saved ${result.totalBytesSaved} bytes`);
console.log(
  `Updated ${result.totalReferencesUpdated} references across ${result.conversions.length} images`,
);
```

## Why word-boundary matching matters

Naive string-replace is dangerous. Consider this codebase:

```
public/logo.png
public/big-logo.png
public/logo-dark.png
```

With naive `.includes()` replacement on `logo.png`, you'd accidentally rewrite all three. `webp-me-all` uses a safe boundary regex that only matches the filename when surrounded by whitespace, quotes, parentheses, brackets, slashes or other URL-safe separators — so `big-logo.png` stays intact.

## Options

| Option             | Type                 | Default           | Description                                   |
| ------------------ | -------------------- | ----------------- | --------------------------------------------- |
| `input`            | `string \| string[]` | **required**      | Glob(s) for images to convert.                |
| `quality`          | `number` (1–100)     | `80`              | WebP quality.                                 |
| `lossless`         | `boolean`            | `false`           | Use lossless compression.                     |
| `effort`           | `number` (0–6)       | `4`               | CPU effort — higher = smaller but slower.     |
| `updateReferences` | `boolean`            | `true`            | Update filename references in your codebase.  |
| `referenceGlobs`   | `string[]`           | sensible defaults | Where to search for references.               |
| `deleteOriginals`  | `boolean`            | `false`           | Delete originals after successful conversion. |
| `dryRun`           | `boolean`            | `false`           | Preview only — no disk writes.                |
| `cwd`              | `string`             | `process.cwd()`   | Working directory.                            |
| `onProgress`       | `function`           | —                 | Per-image callback.                           |
| `onComplete`       | `function`           | —                 | Finished-run callback.                        |

### CLI flags

```
Usage: webp-me-all [patterns...] [options]

Arguments:
  patterns                Glob pattern(s) for images (default: **/*.{png,jpg,jpeg,tiff,gif,avif})

Options:
  -q, --quality <n>       WebP quality 1-100 (default: 80)
  -e, --effort <n>        CPU effort 0-6 (default: 4)
  --lossless              Use lossless WebP compression
  --no-update-refs        Do NOT update references in your codebase
  -r, --ref-glob <p>      Glob(s) for files to scan for references (repeatable)
  --delete-originals      Delete originals after successful conversion
  -d, --dry-run           Preview changes without writing anything to disk
  -C, --cwd <dir>         Working directory (default: cwd)
  -s, --silent            Suppress output except errors
  --json                  Emit final result as JSON
  -h, --help              Show help
  -V, --version           Show version
```

## Framework guides

Because the reference scanner understands TS, TSX, JSX, JSON, MD, MDX, CSS, and framework-specific files (`.vue`, `.svelte`, `.astro`), a single command migrates imports across any modern stack.

### Next.js

```bash
npx webp-me-all "public/**/*.{png,jpg,jpeg}" --ref-glob "app/**/*.{ts,tsx,mdx}" --ref-glob "components/**/*.tsx"
```

```tsx
// Before
import hero from "/public/hero.png";
<Image src="/images/avatar.jpg" alt="Me" />;

// After
import hero from "/public/hero.webp";
<Image src="/images/avatar.webp" alt="Me" />;
```

### Astro

```bash
npx webp-me-all "src/assets/**/*.{png,jpg}" --ref-glob "src/**/*.{astro,md,mdx,ts}"
```

### Vite / React

```bash
npx webp-me-all "src/assets/**/*.{png,jpg}" --ref-glob "src/**/*.{ts,tsx,css}"
```

### Remix

```bash
npx webp-me-all "public/**/*.{png,jpg}" --ref-glob "app/**/*.{ts,tsx}"
```

### Nuxt / Vue

```bash
npx webp-me-all "public/**/*.{png,jpg}" --ref-glob "**/*.{vue,ts}"
```

### SvelteKit

```bash
npx webp-me-all "static/**/*.{png,jpg}" --ref-glob "src/**/*.{svelte,ts}"
```

## Safety guarantees

- Originals are **kept by default**. Pass `--delete-originals` only when you're confident.
- `--dry-run` prints what would change and returns the exact same result object as a real run.
- `node_modules`, `.git`, `dist`, `build`, `.next`, `.nuxt`, `.astro`, `.svelte-kit`, `out`, and `coverage` are always ignored.
- Word-boundary matching prevents accidental substring replacements.

## FAQ

**How do I convert all PNG and JPG images to WebP in my project?**
Run `npx webp-me-all "public/**/*.{png,jpg,jpeg}" --dry-run` to preview, then drop `--dry-run` to apply. Every import, `src=""`, CSS `url()`, and markdown link pointing at those files is rewritten automatically.

**How do I update image references after converting to WebP?**
That's the whole point of `webp-me-all`: it's the only tool that converts **and** updates references in TS, TSX, JSX, JSON, MD, HTML, CSS, Vue, Svelte, and Astro files in one command.

**What's the best way to migrate a Next.js / Astro / Vite / Remix project to WebP?**
Use `webp-me-all` with `--ref-glob` scoped to your framework's source directories — see the [framework guides](#framework-guides) above.

**Does it work on Windows?**
Yes. Paths are normalized via Node's `path` module and `fast-glob`.

**What if my build tool already converts to WebP at build time (Next/Image, Astro Assets)?**
Those optimize at request time and don't migrate your source images. `webp-me-all` is a one-shot codebase migration — run it once, commit the diff, move on.

**Can I run it in CI to catch regressions?**
Yes. Run with `--dry-run --json` and parse the output. If `totalReferencesUpdated > 0`, you have images that slipped through.

**Does it re-optimize existing `.webp` files?**
No. WebP inputs are skipped automatically.

**Is it safe to run on a large codebase?**
Yes. Originals are kept by default, word-boundary matching prevents substring collisions, and `--dry-run` gives you a full preview before anything touches disk.

**Does it support AVIF?**
`.avif` files are recognized as **input** (converted to WebP). AVIF output is on the roadmap.

## Contributing

Issues and PRs welcome. Run the test suite with:

```bash
npm install
npm test
```

## License

[MIT](./LICENSE) © Jose
