const express = require('express');
const router = express.Router();

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    seo: {
      title: 'About Us - Vegan Restaurant Find',
      description: 'Learn about our mission to help people discover amazing vegan restaurants across America. Find plant-based dining options with verified reviews.',
      canonical: `${req.protocol}://${req.get('host')}/about`,
      ogImage: `${req.protocol}://${req.get('host')}/images/logo.png`
    }
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', {
    seo: {
      title: 'Contact Us - Vegan Restaurant Find',
      description: 'Get in touch with us to suggest restaurants, report issues, or ask questions about our vegan restaurant directory.',
      canonical: `${req.protocol}://${req.get('host')}/contact`,
      ogImage: `${req.protocol}://${req.get('host')}/images/logo.png`
    }
  });
});

module.exports = router;