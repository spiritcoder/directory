const express = require('express');
const TattooShop = require('../models/TattooShop');
const router = express.Router();

// State listing page
router.get('/:state', async (req, res) => {
  try {
    const stateSlug = req.params.state;
    const stateName = stateSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const { category, page = 1 } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    let query = { 'address.state': stateName };
    if (category) query.category = category;

    const [restaurants, totalCount, categories, topRated, stats] = await Promise.all([
      TattooShop.find(query)
        .select('businessName slug address rating reviewCount images category description priceRange')
        .sort({ rating: -1, reviewCount: -1 })
        .skip(skip)
        .limit(limit),
      TattooShop.countDocuments(query),
      TattooShop.distinct('category', { 'address.state': stateName }).then(cats => cats.filter(Boolean).sort()),
      TattooShop.find({ 'address.state': stateName, rating: { $gte: 4.5 } })
        .select('businessName slug rating reviewCount')
        .sort({ rating: -1, reviewCount: -1 })
        .limit(3),
      TattooShop.aggregate([
        { $match: { 'address.state': stateName } },
        { $group: {
          _id: null,
          totalShops: { $sum: 1 },
          totalReviews: { $sum: '$reviewCount' },
          avgRating: { $avg: '$rating' },
          cities: { $addToSet: '$address.city' }
        }}
      ])
    ]);

    if (totalCount === 0) {
      return res.status(404).render('404', {
        seo: {
          title: `No Tattoo Shops Found in ${stateName} - US Tattoo Shop Directory`,
          description: `No vegan restaurants found in ${stateName}. Check back later for updates.`,
          canonical: `${req.protocol}://${req.get('host')}/state/${stateSlug}`
        }
      });
    }

    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);
    const stateStats = stats[0] || {};

    res.render('state', {
      stateName,
      stateSlug,
      restaurants,
      categories,
      topRated,
      selectedCategory: category || '',
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage + 1,
      prevPage: currentPage - 1,
      stats: {
        totalRestaurants: stateStats.totalShops || 0,
        totalReviews: stateStats.totalReviews || 0,
        avgRating: Math.round((stateStats.avgRating || 0) * 10) / 10,
        totalCities: (stateStats.cities || []).length
      },
      seo: {
        title: `Tattoo Shops in ${stateName} - Professional Tattoo Artists Guide`,
        description: `Find the best vegan restaurants in ${stateName}. Browse ${totalCount} plant-based dining options with reviews and ratings.`,
        canonical: `${req.protocol}://${req.get('host')}/state/${stateSlug}`,
        ogImage: `${req.protocol}://${req.get('host')}${restaurants[0]?.images[0]}` || `${req.protocol}://${req.get('host')}/images/logo.png`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;