const express = require('express');
const TattooShop = require('../models/TattooShop');
const router = express.Router();

// Tattoo shop details page
router.get('/:slug', async (req, res) => {
  try {
    const tattooShop = await TattooShop.findOne({ slug: req.params.slug });
    
    if (!tattooShop) {
      return res.status(404).render('404', {
        seo: {
          title: 'Tattoo Shop Not Found - US Tattoo Shop Directory',
          description: 'The tattoo shop you are looking for does not exist.',
          canonical: `${req.protocol}://${req.get('host')}/tattoo-shop/${req.params.slug}`
        }
      });
    }

    // Get top 5 reviews
    const topReviews = tattooShop.reviews
      .sort((a, b) => b.rating - a.rating || b.date - a.date)
      .slice(0, 5);

    // Get nearby tattoo shops (same city, then same state, excluding current)
    const nearbyShops = await TattooShop.find({
      _id: { $ne: tattooShop._id },
      $or: [
        { 'address.city': tattooShop.address.city, 'address.state': tattooShop.address.state },
        { 'address.state': tattooShop.address.state }
      ]
    })
    .select('businessName slug address rating reviewCount images')
    .sort({ 
      'address.city': tattooShop.address.city ? -1 : 1, // Prioritize same city
      rating: -1, 
      reviewCount: -1 
    })
    .limit(5);

    res.render('tattoo-shop', {
      tattooShop,
      topReviews,
      nearbyShops,
      seo: {
        title: `${tattooShop.businessName} - Tattoo Shop in ${tattooShop.address.city}, ${tattooShop.address.state}`,
        description: tattooShop.description ? 
          tattooShop.description.substring(0, 160) + '...' : 
          `${tattooShop.businessName} is a tattoo shop located in ${tattooShop.address.city}, ${tattooShop.address.state}. Rating: ${tattooShop.rating}/5 stars.`,
        canonical: `${req.protocol}://${req.get('host')}/tattoo-shop/${tattooShop.slug}`,
        ogImage: `${req.protocol}://${req.get('host')}${tattooShop.images[0]}` || `${req.protocol}://${req.get('host')}/images/logo.png`
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;