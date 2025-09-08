const mongoose = require('mongoose');
const TattooShop = require('../models/TattooShop');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

async function generateDescription(tattooShop) {
  if (!process.env.CLAUDE_API_KEY) {
    console.log('No Claude API key found, using original description');
    return tattooShop.description || '';
  }
  
  try {
    const prompt = `Write a natural description for this tattoo shop in exactly 2 paragraphs separated by a blank line:

Name: ${tattooShop.businessName}
Category: ${tattooShop.category}
Location: ${tattooShop.address?.city}, ${tattooShop.address?.state || 'Unknown'}
Price Range: ${tattooShop.priceRange || 'Not specified'}
Rating: ${tattooShop.rating}/5 (${tattooShop.reviewCount} reviews)
Existing details: ${tattooShop.description || 'No additional details'}

First paragraph: describe the atmosphere and what makes this shop special. Second paragraph: mention key features or specialties. Write in a conversational tone without quotes. Format as two separate paragraphs with a line break between them. Keep under 120 words total.`;
    
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
    
    console.log(`Generated description for ${tattooShop.businessName}`);
    return generatedDescription;
    
  } catch (error) {
    console.log(`Failed to generate description for ${tattooShop.businessName}: ${error.message}`);
    return tattooShop.description || '';
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

async function processTattooShopImages(tattooShop, shopIndex, stateName) {
  const localImages = [];
  const shopName = tattooShop.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const shopFolder = `${shopName}-${stateName.toLowerCase().replace(/\s+/g, '-')}`;
  const shopDir = path.join(__dirname, '../public/images/tattoo-shops', shopFolder);
  
  // Create tattoo shop directory if it doesn't exist
  if (!fs.existsSync(shopDir)) {
    fs.mkdirSync(shopDir, { recursive: true });
  }
  
  for (let i = 0; i < tattooShop.images.length && i < 5; i++) {
    try {
      const imageUrl = tattooShop.images[i];
      const filename = `${i}.jpg`;
      const filepath = path.join(shopDir, filename);
      const localPath = `/images/tattoo-shops/${shopFolder}/${filename}`;
      
      await downloadImage(imageUrl, filepath);
      localImages.push(localPath);
      console.log(`Downloaded image: ${shopFolder}/${filename}`);
    } catch (error) {
      console.log(`Failed to download image ${i} for ${tattooShop.businessName}: ${error.message}`);
    }
  }
  
  return localImages;
}

function extractStateFromFilename(filename) {
  // Handle both singular and plural patterns
  const match = filename.match(/google_maps_tattoo_shops?_in_([a-z_]+)_\d{4}/i);
  if (match) {
    return match[1].split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  return null;
}

function getCountryFromFolder(folderName) {
  const countryMap = {
    'data-us': 'United States',
    'data-canada': 'Canada', 
    'data-uk': 'United Kingdom'
  };
  return countryMap[folderName] || 'Unknown';
}

function getDataFolders() {
  const baseDir = path.join(__dirname, '..');
  return fs.readdirSync(baseDir)
    .filter(item => {
      const fullPath = path.join(baseDir, item);
      return fs.statSync(fullPath).isDirectory() && item.startsWith('data-');
    })
    .map(folder => ({
      folder,
      country: getCountryFromFolder(folder),
      path: path.join(baseDir, folder)
    }));
}

function generateSlug(businessName, city) {
  const name = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const location = city ? city.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') : '';
  return location ? `${name}-${location}` : name;
}

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/us-tattoo-shops');
    
    // Get all data folders
    const dataFolders = getDataFolders();
    console.log(`Found ${dataFolders.length} data folders:`);
    dataFolders.forEach(({folder, country}) => {
      console.log(`  ${folder} → ${country}`);
    });
    
    let allFiles = [];
    let processedStates = [];
    
    // Process each data folder
    for (const {folder, country, path: folderPath} of dataFolders) {
      if (!fs.existsSync(folderPath)) {
        console.log(`⚠️  Folder ${folder} not found, skipping...`);
        continue;
      }
      
      const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.json'));
      console.log(`\n📁 Processing ${folder} (${country}): ${files.length} files`);
      
      // Extract state names for this country
      const stateNames = [];
      for (const file of files) {
        const stateName = extractStateFromFilename(file);
        if (stateName) {
          stateNames.push(stateName);
          allFiles.push({ file, country, folderPath, stateName });
        }
      }
      
      console.log(`📍 States in ${country}: ${stateNames.sort().join(', ')}`);
    }
    
    console.log('\n🚀 Starting processing...\n');
    
    for (const {file, country, folderPath, stateName} of allFiles) {
      console.log(`✅ Processing: ${file} → ${stateName}, ${country}`);
      processedStates.push(`${stateName} (${country})`);
      
      const filePath = path.join(folderPath, file);
      const rawData = fs.readFileSync(filePath, 'utf8');
      const tattooShops = JSON.parse(rawData);
      
      for (let index = 0; index < tattooShops.length; index++) {
        const tattooShop = tattooShops[index];
        try {
          console.log(`Processing ${tattooShop.businessName} (${index + 1}/${tattooShops.length}) from ${stateName}`);
          
          // Check for duplicate FIRST (before downloading images)
          const existingShop = await TattooShop.findOne({
            businessName: new RegExp(`^${tattooShop.businessName}$`, 'i'),
            'address.city': tattooShop.address?.city
          });
          
          if (existingShop) {
            console.log(`⏭️  Skipping duplicate: ${tattooShop.businessName} in ${tattooShop.address?.city}`);
            continue;
          }
          
          // Download images (only for new tattoo shops)
          const localImages = await processTattooShopImages(tattooShop, index, stateName);
          
          // AI description will be generated separately
          console.log(`Skipping AI description for ${tattooShop.businessName}`);
          
          const processedShop = {
            businessName: tattooShop.businessName || 'Unknown Shop',
            slug: generateSlug(tattooShop.businessName || `shop-${index}`, tattooShop.address?.city || 'unknown'),
            address: {
              street: tattooShop.address?.street || '',
              city: tattooShop.address?.city || '',
              state: stateName,
              zipCode: tattooShop.address?.zipCode || '',
              country: country
            },
            phone: tattooShop.phone || '',
            website: tattooShop.website || '',
            rating: parseFloat(tattooShop.rating) || 0,
            reviewCount: parseInt(tattooShop.reviewCount) || 0,
            reviews: Array.isArray(tattooShop.reviews) ? tattooShop.reviews : [],
            hours: Array.isArray(tattooShop.hours) ? tattooShop.hours : [],
            category: tattooShop.category || 'Tattoo shop',
            description: tattooShop.description || '',
            about: '',
            images: localImages,
            priceRange: tattooShop.priceRange || ''
          };
          
          // Save individual tattoo shop to database
          const newShop = new TattooShop(processedShop);
          await newShop.save();
          console.log(`✅ Saved: ${tattooShop.businessName}`);
          
        } catch (error) {
          console.error(`❌ Error processing tattoo shop ${index} in ${stateName}:`, error.message);
        }
      }
      
      console.log(`Completed processing ${stateName}, ${country}`);
    }
    
    const totalShops = await TattooShop.countDocuments();
    const countryCounts = await TattooShop.aggregate([
      { $group: { _id: '$address.country', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log(`\n🎉 Database seeded successfully!`);
    console.log(`📊 Total tattoo shops: ${totalShops}`);
    console.log(`🌍 Countries processed:`);
    countryCounts.forEach(({_id, count}) => {
      console.log(`  ${_id}: ${count} tattoo shops`);
    });
    console.log(`📍 Regions processed: ${processedStates.length}`);
    console.log(processedStates.sort().join(', '));
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();