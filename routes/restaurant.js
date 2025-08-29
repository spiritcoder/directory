const express = require('express');
const Restaurant = require('../models/Restaurant');
const router = express.Router();

// Restaurant details page
router.get('/:slug', async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ slug: req.params.slug });
    
    if (!restaurant) {
      return res.status(404).render('404', {
        seo: {
          title: 'Restaurant Not Found - US Vegan Restaurant Directory',
          description: 'The restaurant you are looking for does not exist.',
          canonical: `${req.protocol}://${req.get('host')}/restaurant/${req.params.slug}`
        }
      });
    }

    // Get top 5 reviews
    const topReviews = restaurant.reviews
      .sort((a, b) => b.rating - a.rating || b.date - a.date)
      .slice(0, 5);

    // Get nearby restaurants (same city, then same state, excluding current)
    const nearbyRestaurants = await Restaurant.find({
      _id: { $ne: restaurant._id },
      $or: [
        { 'address.city': restaurant.address.city, 'address.state': restaurant.address.state },
        { 'address.state': restaurant.address.state }
      ]
    })
    .select('businessName slug address rating reviewCount images')
    .sort({ 
      'address.city': restaurant.address.city ? -1 : 1, // Prioritize same city
      rating: -1, 
      reviewCount: -1 
    })
    .limit(5);

    res.render('restaurant', {
      restaurant,
      topReviews,
      nearbyRestaurants,
      seo: {
        title: `${restaurant.businessName} - Vegan Restaurant in ${restaurant.address.city}, ${restaurant.address.state}`,
        description: restaurant.description ? 
          restaurant.description.substring(0, 160) + '...' : 
          `${restaurant.businessName} is a vegan restaurant located in ${restaurant.address.city}, ${restaurant.address.state}. Rating: ${restaurant.rating}/5 stars.`,
        canonical: `${req.protocol}://${req.get('host')}/restaurant/${restaurant.slug}`,
        ogImage: `${req.protocol}://${req.get('host')}${restaurant.images[0]}` || `${req.protocol}://${req.get('host')}/images/logo.png`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;