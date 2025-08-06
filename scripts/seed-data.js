const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

async function generateDescription(restaurant) {
  if (!process.env.CLAUDE_API_KEY) {
    console.log('No Claude API key found, using original description');
    return restaurant.description || '';
  }
  
  try {
    const prompt = `Write a natural description for this vegan restaurant in exactly 2 paragraphs separated by a blank line:

Name: ${restaurant.businessName}
Category: ${restaurant.category}
Location: ${restaurant.address?.city}, ${restaurant.address?.state || 'Unknown'}
Price Range: ${restaurant.priceRange || 'Not specified'}
Rating: ${restaurant.rating}/5 (${restaurant.reviewCount} reviews)
Existing details: ${restaurant.description || 'No additional details'}

First paragraph: describe the atmosphere and what makes this place special. Second paragraph: mention key features or specialties. Write in a conversational tone without quotes. Format as two separate paragraphs with a line break between them. Keep under 120 words total.`;
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: prompt
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000
    });
    
    let generatedDescription = response.data.content[0].text.trim();
    
    // Remove quotes if present
    generatedDescription = generatedDescription.replace(/^["']|["']$/g, '');
    
    // Convert line breaks to HTML paragraphs
    generatedDescription = generatedDescription.split('\n\n').map(p => p.trim()).filter(p => p).join('</p><p>');
    generatedDescription = `<p>${generatedDescription}</p>`;
    
    console.log(`Generated description for ${restaurant.businessName}`);
    return generatedDescription;
    
  } catch (error) {
    console.log(`Failed to generate description for ${restaurant.businessName}: ${error.message}`);
    return restaurant.description || '';
  }
}

function modifyGoogleImageUrl(url) {
  // Replace existing size parameters with =s800 for uniform 800px images
  let modifiedUrl = url.replace(/=w\d+-h\d+(-[ck])?(-no)?/g, '=s800');
  modifiedUrl = modifiedUrl.replace(/=s\d+/g, '=s800');
  
  // If no size parameters found, append =s800
  if (!modifiedUrl.includes('=s800')) {
    modifiedUrl += '=s800';
  }
  
  return modifiedUrl;
}

async function downloadImage(url, filepath) {
  try {
    const modifiedUrl = modifyGoogleImageUrl(url);
    console.log(`Modified URL: ${url} -> ${modifiedUrl}`);
    
    const response = await axios({
      method: 'GET',
      url: modifiedUrl,
      responseType: 'stream',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filepath));
      writer.on('error', reject);
    });
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

async function processRestaurantImages(restaurant, restaurantIndex, stateName) {
  const localImages = [];
  const restaurantName = restaurant.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const restaurantFolder = `${restaurantName}-${stateName.toLowerCase().replace(/\s+/g, '-')}`;
  const restaurantDir = path.join(__dirname, '../public/images/restaurants', restaurantFolder);
  
  // Create restaurant directory if it doesn't exist
  if (!fs.existsSync(restaurantDir)) {
    fs.mkdirSync(restaurantDir, { recursive: true });
  }
  
  for (let i = 0; i < restaurant.images.length && i < 5; i++) {
    try {
      const imageUrl = restaurant.images[i];
      const filename = `${i}.jpg`;
      const filepath = path.join(restaurantDir, filename);
      const localPath = `/images/restaurants/${restaurantFolder}/${filename}`;
      
      await downloadImage(imageUrl, filepath);
      localImages.push(localPath);
      console.log(`Downloaded image: ${restaurantFolder}/${filename}`);
    } catch (error) {
      console.log(`Failed to download image ${i} for ${restaurant.businessName}: ${error.message}`);
    }
  }
  
  return localImages;
}

function extractStateFromFilename(filename) {
  const match = filename.match(/google_maps_vegan_restaurant_in_([a-z_]+)_\d{4}/i);
  if (match) {
    return match[1].split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  return null;
}

function generateSlug(businessName, city) {
  const name = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const location = city ? city.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : '';
  return location ? `${name}-${location}` : name;
}

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vegan-restaurants');
    
    // Clear existing data
    await Restaurant.deleteMany({});
    
    const dataDir = path.join(__dirname, '../data');
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    console.log(`Found ${files.length} JSON files`);
    
    // Extract and list all state names first
    const stateNames = [];
    for (const file of files) {
      const stateName = extractStateFromFilename(file);
      if (stateName) {
        stateNames.push(stateName);
      }
    }
    
    console.log(`\n📍 Matched ${stateNames.length} states:`);
    console.log(stateNames.sort().join(', '));
    console.log('\n🚀 Starting processing...\n');
    
    let allRestaurants = [];
    let processedStates = [];
    
    for (const file of files) {
      const stateName = extractStateFromFilename(file);
      if (!stateName) {
        console.log(`❌ Skipping file ${file} - could not extract state name`);
        continue;
      }
      
      console.log(`✅ Processing file: ${file} -> State: ${stateName}`);
      processedStates.push(stateName);
      
      const filePath = path.join(dataDir, file);
      const rawData = fs.readFileSync(filePath, 'utf8');
      const restaurants = JSON.parse(rawData);
      
      for (let index = 0; index < restaurants.length; index++) {
        const restaurant = restaurants[index];
        try {
          console.log(`Processing ${restaurant.businessName} (${index + 1}/${restaurants.length}) from ${stateName}`);
          
          // Check for duplicate
          const key = `${restaurant.businessName}-${restaurant.address?.city || ''}`.toLowerCase();
          const existingRestaurant = await Restaurant.findOne({
            businessName: new RegExp(`^${restaurant.businessName}$`, 'i'),
            'address.city': restaurant.address?.city
          });
          
          if (existingRestaurant) {
            console.log(`Skipping duplicate: ${restaurant.businessName} in ${restaurant.address?.city}`);
            continue;
          }
          
          // Download images
          const localImages = await processRestaurantImages(restaurant, index, stateName);
          
          // AI description will be generated separately
          console.log(`Skipping AI description for ${restaurant.businessName}`);
          
          const processedRestaurant = {
            businessName: restaurant.businessName || 'Unknown Restaurant',
            slug: generateSlug(restaurant.businessName || `restaurant-${index}`, restaurant.address?.city || 'unknown'),
            address: {
              street: restaurant.address?.street || '',
              city: restaurant.address?.city || '',
              state: stateName,
              zipCode: restaurant.address?.zipCode || '',
              country: restaurant.address?.country || 'United States'
            },
            phone: restaurant.phone || '',
            website: restaurant.website || '',
            rating: parseFloat(restaurant.rating) || 0,
            reviewCount: parseInt(restaurant.reviewCount) || 0,
            reviews: Array.isArray(restaurant.reviews) ? restaurant.reviews : [],
            hours: Array.isArray(restaurant.hours) ? restaurant.hours : [],
            category: restaurant.category || 'Restaurant',
            description: restaurant.description || '',
            about: '',
            images: localImages,
            priceRange: restaurant.priceRange || ''
          };
          
          // Save individual restaurant to database
          const newRestaurant = new Restaurant(processedRestaurant);
          await newRestaurant.save();
          console.log(`✅ Saved: ${restaurant.businessName}`);
          
        } catch (error) {
          console.error(`❌ Error processing restaurant ${index} in ${stateName}:`, error.message);
        }
      }
      
      console.log(`Completed processing ${stateName}`);
    }
    
    const totalRestaurants = await Restaurant.countDocuments();
    console.log(`\n🎉 Database seeded successfully!`);
    console.log(`📊 Total restaurants in database: ${totalRestaurants}`);
    console.log(`📁 Found ${files.length} JSON files`);
    console.log(`📍 Processed ${processedStates.length} states:`);
    console.log(processedStates.sort().join(', '));
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();