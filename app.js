const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// URL canonicalization middleware - MUST be first
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const canonicalHost = 'veganrestaurantfinds.com';
    
    // Force HTTPS in production
    if (protocol !== 'https') {
      return res.redirect(301, `https://${canonicalHost}${req.originalUrl}`);
    }
    
    // Remove www and enforce canonical domain
    if (host && (host.startsWith('www.') || host !== canonicalHost)) {
      return res.redirect(301, `${protocol}://${canonicalHost}${req.originalUrl}`);
    }
    
    // Remove trailing slashes except for root
    if (req.path !== '/' && req.path.endsWith('/')) {
      const query = req.url.slice(req.path.length);
      return res.redirect(301, req.path.slice(0, -1) + query);
    }
    
    next();
  });
}

// Security middleware
app.use(helmet());

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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vegan-restaurants')
  .then(async () => {
    console.log('Connected to MongoDB');
    // Generate sitemap on startup
    const { generateSitemap } = require('./utils/sitemap');
    await generateSitemap();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/country'));
app.use('/state', require('./routes/state'));
app.use('/restaurant', require('./routes/restaurant'));
app.use('/search', require('./routes/search'));
app.use('/', require('./routes/pages'));

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    seo: {
      title: 'Page Not Found - Vegan Restaurant Directory',
      description: 'The page you are looking for does not exist.',
      canonical: `${req.protocol}://${req.get('host')}${req.originalUrl}`
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});