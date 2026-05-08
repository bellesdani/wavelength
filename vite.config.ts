import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const DEFAULT_SITE_URL = 'https://laruletadetiktok.com';

function normalizeSiteUrl(value: string | undefined) {
  return (value || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const siteUrl = normalizeSiteUrl(env.VITE_SITE_URL);

  return {
    plugins: [react(), tailwindcss(), seoFilesPlugin(siteUrl), inlineSmallCssPlugin()],
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

function inlineSmallCssPlugin() {
  const maxInlineBytes = 30 * 1024;

  return {
    name: 'la-ruleta-inline-small-css',
    enforce: 'post' as const,
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['index.html'];

      if (!htmlAsset || htmlAsset.type !== 'asset') {
        return;
      }

      let html = String(htmlAsset.source);
      const stylesheetLinkPattern = /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+\.css)["'])[^>]*>/g;
      const stylesheetLinks = Array.from(html.matchAll(stylesheetLinkPattern));

      for (const match of stylesheetLinks) {
        const [linkTag, href] = match;
        const fileName = href.replace(/^\//, '');
        const cssAsset = bundle[fileName];

        if (!cssAsset || cssAsset.type !== 'asset') {
          continue;
        }

        const css = String(cssAsset.source);

        if (Buffer.byteLength(css, 'utf8') > maxInlineBytes) {
          continue;
        }

        html = html.replace(linkTag, `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
        delete bundle[fileName];
      }

      htmlAsset.source = html;
    },
  };
}

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
