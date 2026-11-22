import { build } from 'esbuild';
import path from 'node:path';
await build({ entryPoints: ['src/index.ts'], outfile: '.tmp/test-build/index.js', bundle: true, format: 'esm', platform: 'browser', external: ['cloudflare:workers'], conditions: ['workerd'], target: 'es2022', plugins: [{ name: 'neutral-library-fixture', setup(build) { build.onResolve({ filter: /catalog\.generated\.json$/ }, () => ({ path: path.resolve('tests/catalog.fixture.json') })); } }] });
