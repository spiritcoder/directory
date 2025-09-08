const mongoose = require('mongoose');

// US States validation
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const tattooShopSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  address: {
    street: String,
    city: String,
    state: { type: String, required: true, enum: US_STATES },
    zipCode: String,
    country: { type: String, default: 'United States' }
  },
  phone: String,
  website: String,
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  reviews: [String],
  hours: [String],
  category: String,
  description: String,
  about: String,
  
  // Tattoo-specific fields
  artistSpecialties: String,
  tattooStyles: String,
  piercingServices: String,
  portfolioHighlights: String,
  atmosphereDescription: String,
  bestTimesToVisit: String,
  uniqueSellingPoints: String,
  localContext: String,
  faqSection: String,
  
  // AI generation tracking
  aiDescriptionGenerated: { type: Boolean, default: false },
  aiDescriptionAttempts: { type: Number, default: 0 },
  aiContentGenerated: { type: Boolean, default: false },
  aiContentAttempts: { type: Number, default: 0 },
  
  images: [String],
  priceRange: String
}, { timestamps: true });

// Generate slug before saving
tattooShopSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.businessName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + this.address.city.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
  next();
});

// Add indexes for faster queries
tattooShopSchema.index({ 'address.state': 1 });
tattooShopSchema.index({ category: 1 });
tattooShopSchema.index({ rating: -1 });
tattooShopSchema.index({ slug: 1 });
tattooShopSchema.index({ 'address.state': 1, category: 1 });
tattooShopSchema.index({ 'address.state': 1, rating: -1 });

module.exports = mongoose.model('TattooShop', tattooShopSchema);