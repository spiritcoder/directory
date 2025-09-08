const fs = require('fs');
const path = require('path');
const TattooShop = require('../models/TattooShop');

async function generateSitemap() {
  try {
    const baseUrl = 'https://ustattoo-shops.com'; // Always use canonical URL
    const currentDate = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
`;

    // Get all states
    const states = await TattooShop.distinct('address.state');
    states.forEach(state => {
      const stateSlug = state.toLowerCase().replace(/\s+/g, '-');
      sitemap += `  <url>
    <loc>${baseUrl}/state/${stateSlug}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
    });

    // Get all tattoo shops
    const tattooShops = await TattooShop.find({}, 'slug updatedAt');
    tattooShops.forEach(tattooShop => {
      const lastmod = tattooShop.updatedAt ? tattooShop.updatedAt.toISOString().split('T')[0] : currentDate;
      sitemap += `  <url>
    <loc>${baseUrl}/tattoo-shop/${tattooShop.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
    });

    sitemap += '</urlset>';

    // Write sitemap to public directory
    const sitemapPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    
    console.log(`✅ Sitemap generated with ${states.length} states and ${tattooShops.length} tattoo shops`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
  }
}

module.exports = { generateSitemap };