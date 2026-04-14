import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'node18',
  outDir: 'dist',
  shims: true,
  banner: ({ format }) => {
    // Add shebang only to the CLI entry in ESM build
    return {};
  },
  esbuildOptions(options, context) {
    // Don't add shebang globally — handled per-file in onSuccess
  },
  onSuccess: async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');

    const indexPath = path.resolve('dist/index.js');
    const cliPath = path.resolve('dist/cli.js');

    try {
      // Ensure index.js does NOT have a shebang
      const indexContent = await fs.readFile(indexPath, 'utf8');
      if (indexContent.startsWith('#!/usr/bin/env node')) {
        await fs.writeFile(
          indexPath,
          indexContent.replace(/^#!\/usr\/bin\/env node\n/, ''),
          'utf8',
        );
      }

      // Ensure cli.js DOES have a shebang
      const cliContent = await fs.readFile(cliPath, 'utf8');
      if (!cliContent.startsWith('#!/usr/bin/env node')) {
        await fs.writeFile(cliPath, `#!/usr/bin/env node\n${cliContent}`, 'utf8');
      }
      await fs.chmod(cliPath, 0o755);
    } catch {
      // dist files may not exist in watch mode, ignore
    }
  },
});
