const express = require('express');
const router = express.Router();

// About page
router.get('/about', (req, res) => {
  res.render('about', {
    seo: {
      title: 'About Us - US Tattoo Shop Directory',
      description: 'Learn about our mission to help people discover amazing tattoo shops across America. Find professional tattoo artists with verified reviews.',
      canonical: `${req.protocol}://${req.get('host')}/about`,
      ogImage: `${req.protocol}://${req.get('host')}/images/logo.png`
    }
  });
});

// Contact page
router.get('/contact', (req, res) => {
  res.render('contact', {
    seo: {
      title: 'Contact Us - US Tattoo Shop Directory',
      description: 'Get in touch with us to suggest tattoo shops, report issues, or ask questions about our tattoo shop directory.',
      canonical: `${req.protocol}://${req.get('host')}/contact`,
      ogImage: `${req.protocol}://${req.get('host')}/images/logo.png`
    }
  });
});

module.exports = router;