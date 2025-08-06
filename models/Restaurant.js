const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
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
  aiDescriptionGenerated: { type: Boolean, default: false },
  aiDescriptionAttempts: { type: Number, default: 0 },
  images: [String],
  priceRange: String
}, { timestamps: true });

// Generate slug before saving
restaurantSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.businessName.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + this.address.city.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
  next();
});

// Add indexes for faster queries
restaurantSchema.index({ 'address.state': 1 });
restaurantSchema.index({ category: 1 });
restaurantSchema.index({ rating: -1 });
restaurantSchema.index({ slug: 1 });
restaurantSchema.index({ 'address.state': 1, category: 1 });
restaurantSchema.index({ 'address.state': 1, rating: -1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);