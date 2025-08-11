const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');

const countryConfig = {
  us: {
    name: 'United States',
    flag: '🇺🇸',
    regionType: 'States',
    regions: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']
  },
  canada: {
    name: 'Canada',
    flag: '🇨🇦',
    regionType: 'Provinces & Territories',
    regions: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon']
  },
  uk: {
    name: 'United Kingdom',
    flag: '🇬🇧',
    regionType: 'Regions',
    regions: ['England', 'Scotland', 'Wales', 'Northern Ireland']
  }
};

// Generic country page
router.get('/:country(us|canada|uk)', async (req, res) => {
  try {
    const country = req.params.country;
    const config = countryConfig[country];
    
    // Get actual data from database for all countries
    const countryFilter = country === 'us' ? 'United States' : 
                         country === 'canada' ? 'Canada' : 
                         country === 'uk' ? 'United Kingdom' : null;
    
    const states = await Restaurant.aggregate([
      { $match: { 'address.country': countryFilter } },
      { $group: { 
          _id: '$address.state', 
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const regionsWithData = states.map(state => ({
      name: state._id,
      slug: state._id.toLowerCase().replace(/\s+/g, '-'),
      count: state.count,
      avgRating: Math.round(state.avgRating * 10) / 10
    }));

    res.render('country-regions', {
      country: config,
      regions: regionsWithData,
      totalRegions: states.length,
      totalRestaurants: states.reduce((sum, state) => sum + state.count, 0),
      seo: {
        title: `Vegan Restaurants in ${config.name} - ${states.length > 0 ? 'All ' + config.regionType : 'No Results'}`,
        description: states.length > 0 ? 
          `Browse vegan restaurants across ${config.regionType.toLowerCase()} in ${config.name}.` :
          `No vegan restaurants found in ${config.name} yet. Check back soon for updates.`,
        canonical: `${req.protocol}://${req.get('host')}/${country}`
      }
    });
  } catch (error) {
    console.error(`Error loading ${req.params.country}:`, error);
    res.status(500).render('404');
  }
});

module.exports = router;