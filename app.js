const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'", "https://www.google-analytics.com"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://www.googletagmanager.com",
        "https://tagmanager.google.com",
        "https://www.google-analytics.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "https://www.google-analytics.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      connectSrc: [
        "'self'",
        "https://www.google-analytics.com",
        "https://*.google-analytics.com"
      ],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  })
);


// Compression middleware
app.use(compression());

// Static files with optimized caching
app.use('/images', express.static('public/images', {
  maxAge: '365d', // Images cache for 1 year
  etag: true,
  immutable: true
}));

app.use('/css', express.static('public/css', {
  maxAge: '30d', // CSS cache for 30 days
  etag: true
}));

app.use('/js', express.static('public/js', {
  maxAge: '30d', // JS cache for 30 days
  etag: true
}));

app.use('/favicon', express.static('public/favicon', {
  maxAge: '365d', // Favicons cache for 1 year
  etag: true,
  immutable: true
}));

// Other static files (including sitemap.xml)
app.use(express.static('public', {
  maxAge: '1d',
  etag: true
}));

// EJS setup
app.set('view engine', 'ejs');
app.set('views', './views');

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/us-vegan-restaurants')
  .then(async () => {
    console.log('Connected to MongoDB');
    // Generate sitemap on startup
    const { generateSitemap } = require('./utils/sitemap');
    await generateSitemap();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/', require('./routes/index'));
app.use('/state', require('./routes/state'));
app.use('/restaurant', require('./routes/restaurant'));
app.use('/search', require('./routes/search'));
app.use('/', require('./routes/pages'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    seo: {
      title: 'Page Not Found - US Vegan Restaurant Directory',
      description: 'The page you are looking for does not exist.',
      canonical: `${req.protocol}://${req.get('host')}${req.originalUrl}`
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});