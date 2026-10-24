import { defineConfig } from 'tsup';
export default defineConfig([
  // The module: importing it sets window.__fdConsent.
  { entry: { index: 'src/index.ts' }, format: ['esm'], dts: true, clean: true, sourcemap: true, target: 'es2020' },
  // The same script as the CDN's, for a <script> tag served from your own origin.
  { entry: { 'fd-consent-shim': 'src/shim.ts' }, format: ['iife'], minify: true, sourcemap: true, target: 'es2020', outExtension: () => ({ js: '.js' }) },
]);
