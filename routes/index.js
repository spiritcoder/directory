const express = require('express');
const Restaurant = require('../models/Restaurant');
const router = express.Router();

// US States for categories
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// Homepage
router.get('/', async (req, res) => {
  try {
    // Get restaurant counts by state
    const stateCounts = await Restaurant.aggregate([
      { $group: { _id: '$address.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const topStates = stateCounts.slice(0, 8).map(state => ({
      name: state._id,
      slug: state._id.toLowerCase().replace(/\s+/g, '-'),
      count: state.count
    }));

    // Get featured restaurants (top rated with images)
    const featuredRestaurants = await Restaurant.find({ 
      images: { $exists: true, $ne: [] },
      rating: { $gte: 4.0 }
    })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(6)
      .select('businessName slug address rating reviewCount images description priceRange category')
      .lean();

    // Get category counts
    const categoryCounts = await Restaurant.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const topCategories = categoryCounts.slice(0, 6).map(cat => ({
      name: cat._id,
      count: cat.count,
      slug: cat._id.toLowerCase().replace(/\s+/g, '-')
    }));

    // Get total stats
    const totalRestaurants = await Restaurant.countDocuments();
    const totalReviews = await Restaurant.aggregate([
      { $group: { _id: null, total: { $sum: '$reviewCount' } } }
    ]);

    // Get top-rated restaurants for highlights
    const topRated = await Restaurant.find({ rating: { $gte: 4.5 } })
      .sort({ rating: -1, reviewCount: -1 })
      .limit(3)
      .select('businessName slug address rating reviewCount')
      .lean();

    res.render('index', {
      topStates,
      featuredRestaurants,
      topCategories,
      topRated,
      stats: {
        totalRestaurants,
        totalReviews: totalReviews[0]?.total || 0,
        totalStates: stateCounts.length,
        totalCategories: categoryCounts.length
      },
      seo: {
        title: 'US Vegan Restaurant Directory - Find Plant-Based Dining Across America',
        description: 'Discover the best vegan restaurants across the United States. Browse by state and city, read reviews, and find your next plant-based dining experience.',
        canonical: `${req.protocol}://${req.get('host')}/`,
        ogImage: `${req.protocol}://${req.get('host')}/images/logo.png`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;