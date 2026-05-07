import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const DEFAULT_SITE_URL = 'https://la-ruleta-de-tiktok.com';

function normalizeSiteUrl(value: string | undefined) {
  return (value || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL);

  return {
    plugins: [react(), tailwindcss(), seoFilesPlugin(siteUrl)],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // File watching is disabled there to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

function seoFilesPlugin(siteUrl: string) {
  return {
    name: 'la-ruleta-seo-files',
    transformIndexHtml(html: string) {
      return html.replaceAll('__SITE_URL__', siteUrl);
    },
    generateBundle() {
      this.emitFile({
        fileName: 'robots.txt',
        source: [
          'User-agent: *',
          'Allow: /',
          '',
          `Sitemap: ${siteUrl}/sitemap.xml`,
          '',
        ].join('\n'),
        type: 'asset',
      });

      this.emitFile({
        fileName: 'sitemap.xml',
        source: [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
          '  <url>',
          `    <loc>${siteUrl}/</loc>`,
          '    <changefreq>weekly</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>',
          '</urlset>',
          '',
        ].join('\n'),
        type: 'asset',
      });
    },
  };
}
