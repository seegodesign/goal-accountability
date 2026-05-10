import { build } from 'esbuild';
import { minify } from 'html-minifier-terser';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

async function buildJavaScript() {
  await build({
    stdin: {
      contents: "import './src/content-data.js';\nimport './src/app.js';\n",
      resolveDir: rootDir,
      sourcefile: 'build-entry.js'
    },
    bundle: true,
    minify: true,
    platform: 'browser',
    format: 'iife',
    outfile: path.join(distDir, 'app.bundle.js')
  });
}

async function buildHtml() {
  const indexPath = path.join(rootDir, 'index.html');
  const rawHtml = await fs.readFile(indexPath, 'utf8');

  const productionHtml = rawHtml.replace(
    /<script src="src\/content-data\.js"><\/script>\s*<script src="src\/app\.js"><\/script>/,
    '<script src="app.bundle.js"></script>'
  );

  const minifiedHtml = await minify(productionHtml, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
    removeRedundantAttributes: true,
    useShortDoctype: true
  });

  await fs.writeFile(path.join(distDir, 'index.html'), minifiedHtml);
}

async function copyStaticAssets() {
  await Promise.all([
    fs.copyFile(path.join(rootDir, 'src', 'styles.css'), path.join(distDir, 'styles.css')),
    fs.copyFile(path.join(rootDir, 'favicon.svg'), path.join(distDir, 'favicon.svg'))
  ]);
}

async function runBuild() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  await Promise.all([buildJavaScript(), buildHtml(), copyStaticAssets()]);
}

runBuild().catch((error) => {
  console.error(error);
  process.exit(1);
});
