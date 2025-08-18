const express = require('express');
const Restaurant = require('../models/Restaurant');
const router = express.Router();

// Search page
router.get('/', async (req, res) => {
  try {
    const { q, country, state, category, page = 1 } = req.query;
    const limit = 12;
    const skip = (page - 1) * limit;
    
    let query = {};
    let restaurants = [];
    let totalCount = 0;

    // Get all states and categories for dropdowns
    const [allStates, allCategories] = await Promise.all([
      Restaurant.distinct('address.state').then(states => states.sort()),
      Restaurant.distinct('category').then(categories => categories.filter(Boolean).sort())
    ]);

    // Build query
    if (q) {
      query.$or = [
        { businessName: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'address.city': { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }
    if (country) query['address.country'] = country;
    if (state) query['address.state'] = state;
    if (category) query.category = category;

    // Always show results - either search results or default top restaurants
    totalCount = await Restaurant.countDocuments(query);
    restaurants = await Restaurant.find(query)
      .select('businessName slug address rating reviewCount images category description priceRange')
      .sort({ rating: -1, reviewCount: -1 })
      .skip(skip)
      .limit(limit);
    
    // If no search criteria, show default message
    const isDefaultView = !q && !country && !state && !category;

    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = parseInt(page);

    res.render('search', {
      restaurants,
      searchQuery: q || '',
      selectedCountry: country || '',
      selectedState: state || '',
      selectedCategory: category || '',
      allStates,
      allCategories,
      resultCount: totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      nextPage: currentPage + 1,
      prevPage: currentPage - 1,
      isDefaultView,
      seo: {
        title: `Search Results${q ? ` for "${q}"` : ''} - Vegan Restaurant Directory`,
        description: `Find vegan restaurants${q ? ` matching "${q}"` : ''}. Browse plant-based dining options with reviews and ratings.`,
        canonical: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
        ogImage: `${req.protocol}://${req.get('host')}/images/logo.png`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;