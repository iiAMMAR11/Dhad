import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://dhad.iiammar.com',
      lastModified: new Date('2026-09-06'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
