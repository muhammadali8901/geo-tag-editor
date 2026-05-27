import type { APIRoute } from 'astro';
import { SITE } from '../lib/seo';

const staticPaths = [
  '/',
  '/geo-tag-editor/',
  '/add-gps-to-photo-online/',
  '/remove-geotag-from-photo-online/',
  '/blog/',
  '/blog/how-geo-tagging-improves-local-seo-rankings/',
  '/about/',
  '/contact/',
  '/privacy-policy/',
  '/terms/',
  '/disclaimer/',
  '/sitemap/',
];

function toUrl(path: string) {
  return `${SITE.domain}${path}`;
}

export const GET: APIRoute = async () => {
  const urls = staticPaths
    .map((p) => `<url><loc>${toUrl(p)}</loc></url>`)
    .join('');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls +
    `</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

