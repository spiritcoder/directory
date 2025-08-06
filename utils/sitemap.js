const fs = require('fs');
const path = require('path');
const Restaurant = require('../models/Restaurant');

async function generateSitemap() {
  try {
    const baseUrl = process.env.BASE_URL || 'https://veganrestaurantfinds.com';
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
`;

    // Get all states
    const states = await Restaurant.distinct('address.state');
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

    // Get all restaurants
    const restaurants = await Restaurant.find({}, 'slug updatedAt');
    restaurants.forEach(restaurant => {
      const lastmod = restaurant.updatedAt ? restaurant.updatedAt.toISOString().split('T')[0] : currentDate;
      sitemap += `  <url>
    <loc>${baseUrl}/restaurant/${restaurant.slug}</loc>
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
    
    console.log(`✅ Sitemap generated with ${states.length} states and ${restaurants.length} restaurants`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
  }
}

module.exports = { generateSitemap };