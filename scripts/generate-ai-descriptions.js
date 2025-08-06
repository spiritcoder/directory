const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const axios = require('axios');
require('dotenv').config();

async function generateDescription(restaurant) {
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
      timeout: 15000
    });
    
    let generatedDescription = response.data.content[0].text.trim();
    
    // Remove quotes if present
    generatedDescription = generatedDescription.replace(/^["']|["']$/g, '');
    
    // Convert line breaks to HTML paragraphs
    generatedDescription = generatedDescription.split('\n\n').map(p => p.trim()).filter(p => p).join('</p><p>');
    generatedDescription = `<p>${generatedDescription}</p>`;
    
    return generatedDescription;
    
  } catch (error) {
    console.error('Error generating description:', error.response?.data || error.message);
    if (error.response?.status === 529) {
      throw new Error('RATE_LIMITED');
    }
    throw error;
  }
}

async function generateAIDescriptions() {
  try {
    if (!process.env.CLAUDE_API_KEY) {
      console.log('❌ No Claude API key found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vegan-restaurants');
    
    // Find restaurants that need AI descriptions
    const restaurantsToUpdate = await Restaurant.find({
      $or: [
        { aiDescriptionGenerated: false },
        { aiDescriptionGenerated: { $exists: false } },
        { about: { $exists: false } },
        { about: null },
        { about: '' }
      ],
      aiDescriptionAttempts: { $lt: 3 } // Don't retry more than 3 times
    }).select('businessName address category rating reviewCount priceRange description aiDescriptionAttempts');

    console.log(`\n🔍 Found ${restaurantsToUpdate.length} restaurants that need AI descriptions\n`);
    
    if (restaurantsToUpdate.length === 0) {
      console.log('✅ All restaurants already have AI descriptions!');
      process.exit(0);
    }

    let processed = 0;
    let successful = 0;
    let rateLimited = 0;
    let errors = 0;

    for (const restaurant of restaurantsToUpdate) {
      try {
        console.log(`Processing ${processed + 1}/${restaurantsToUpdate.length}: ${restaurant.businessName}`);
        
        const aiDescription = await generateDescription(restaurant);
        
        // Update restaurant with AI description
        await Restaurant.findByIdAndUpdate(restaurant._id, {
          about: aiDescription,
          aiDescriptionGenerated: true,
          $inc: { aiDescriptionAttempts: 1 }
        });
        
        console.log(`✅ Generated description for ${restaurant.businessName}`);
        successful++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        if (error.message === 'RATE_LIMITED') {
          console.log(`⏸️  Rate limited for ${restaurant.businessName} - will retry later`);
          rateLimited++;
          
          // Update attempt count
          await Restaurant.findByIdAndUpdate(restaurant._id, {
            $inc: { aiDescriptionAttempts: 1 }
          });
          
          // Wait longer before continuing
          console.log('⏳ Waiting 30 seconds due to rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          
        } else {
          console.log(`❌ Error for ${restaurant.businessName}: ${error.message}`);
          errors++;
          
          // Update attempt count
          await Restaurant.findByIdAndUpdate(restaurant._id, {
            $inc: { aiDescriptionAttempts: 1 }
          });
        }
      }
      
      processed++;
    }

    console.log(`\n📊 GENERATION COMPLETE`);
    console.log(`═══════════════════════════════════════`);
    console.log(`Total processed: ${processed}`);
    console.log(`Successful: ${successful}`);
    console.log(`Rate limited: ${rateLimited}`);
    console.log(`Errors: ${errors}`);
    
    if (rateLimited > 0) {
      console.log(`\n💡 ${rateLimited} restaurants were rate limited. Run this script again to retry them.`);
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

generateAIDescriptions();