const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Removed data folder detection - now US-only focused

async function generateRichContent(restaurant) {
  try {
    const basePrompt = `Generate comprehensive content for this US vegan restaurant:

Name: ${restaurant.businessName}
Category: ${restaurant.category}
Location: ${restaurant.address?.city}, ${restaurant.address?.state}
Price Range: ${restaurant.priceRange || 'Not specified'}
Rating: ${restaurant.rating}/5 (${restaurant.reviewCount} reviews)
Existing details: ${restaurant.description || 'No additional details'}`;
    
    const sections = [
      {
        field: 'about',
        prompt: `${basePrompt}\n\nWrite a comprehensive 3-paragraph description (250-300 words total). Format your response EXACTLY like this:\n\n<p>Opening paragraph: atmosphere, ambiance, and first impressions</p>\n\n<p>Middle paragraph: food quality, menu variety, and signature items</p>\n\n<p>Closing paragraph: service, value, and overall experience</p>\n\nWrite in engaging, natural language. Use proper <p> tags for each paragraph with line breaks between them. Keep to exactly 250-300 words.`
      },
      {
        field: 'menuHighlights',
        prompt: `${basePrompt}\n\nList 5-7 popular menu items (120-150 words total). Format your response EXACTLY like this:\n\n<ul>\n<li>Item name - brief description</li>\n<li>Item name - brief description</li>\n<li>Item name - brief description</li>\n</ul>\n\nInclude variety (appetizers, mains, desserts, drinks). Be specific about vegan alternatives and creative dishes. Keep each item description to 20-25 words.`
      },
      {
        field: 'atmosphereDescription',
        prompt: `${basePrompt}\n\nDescribe the restaurant's atmosphere in 2-3 paragraphs (150-200 words total). Format your response EXACTLY like this:\n\n<p>First paragraph about decor style, lighting, and overall vibe</p>\n\n<p>Second paragraph about seating arrangements and ambiance details</p>\n\nMake it vivid and appealing. Use proper <p> tags with line breaks between paragraphs. Keep to exactly 150-200 words.`
      },
      {
        field: 'dietaryAccommodations',
        prompt: `${basePrompt}\n\nList exactly 4 dietary accommodations beyond vegan. Each item must be exactly 12-15 words. Format your response EXACTLY like this:\n\n<ul>\n<li>Gluten-Free Options - [exactly 12-15 words describing gluten-free menu items and preparation methods]</li>\n<li>Raw Food Choices - [exactly 12-15 words about raw food options available]</li>\n<li>Nut-Free Alternatives - [exactly 12-15 words about nut-free dishes and allergen protocols]</li>\n<li>Keto-Friendly Items - [exactly 12-15 words about low-carb, high-fat vegan options]</li>\n</ul>\n\nTotal response must be exactly 60-75 words. Be precise with word counts.`
      },
      {
        field: 'bestTimesToVisit',
        prompt: `${basePrompt}\n\nSuggest 3-4 optimal times to visit (80-100 words total). Format your response EXACTLY like this:\n\n<ul>\n<li>Time period - brief reason why it's ideal</li>\n<li>Time period - brief reason why it's ideal</li>\n<li>Time period - brief reason why it's ideal</li>\n</ul>\n\nFocus on timing like "Weekday lunch", "Friday dinner", "Weekend brunch", "Happy hour". Keep each item to 20-25 words.`
      },
      {
        field: 'uniqueSellingPoints',
        prompt: `${basePrompt}\n\nIdentify 3-4 unique aspects that set this restaurant apart (100-120 words total). Format your response EXACTLY like this:\n\n<ul>\n<li>Unique aspect - detailed description</li>\n<li>Unique aspect - detailed description</li>\n<li>Unique aspect - detailed description</li>\n</ul>\n\nInclude chef background, sourcing, preparation methods, special offerings, awards, etc. Keep each description to 25-30 words.`
      },
      {
        field: 'localContext',
        prompt: `${basePrompt}\n\nDescribe the neighborhood and local context in 2 paragraphs (150-200 words total). Format your response EXACTLY like this:\n\n<p>First paragraph: neighborhood character and nearby attractions</p>\n\n<p>Second paragraph: typical clientele and what makes the location special</p>\n\nUse proper <p> tags with line breaks between paragraphs. Keep to exactly 150-200 words.`
      }
    ];
    
    const results = {};
    
    for (const section of sections) {
      // Set optimized token limits based on word count requirements
      let maxTokens = 200; // Reduced default for efficiency
      if (section.field === 'about') maxTokens = 450; // 250-300 words
      if (section.field === 'atmosphereDescription') maxTokens = 300; // 150-200 words
      if (section.field === 'localContext') maxTokens = 300; // 150-200 words
      if (section.field === 'menuHighlights') maxTokens = 350; // 120-150 words + HTML formatting
      if (section.field === 'uniqueSellingPoints') maxTokens = 280; // 100-120 words + HTML formatting
      if (section.field === 'dietaryAccommodations') maxTokens = 250; // 80-100 words + HTML formatting
      if (section.field === 'bestTimesToVisit') maxTokens = 250; // 80-100 words + HTML formatting
      
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-3-haiku-20240307',
        max_tokens: maxTokens,
        messages: [{
          role: 'user',
          content: section.prompt
        }]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        timeout: 15000
      });
      
      let content = response.data.content[0].text.trim();
      content = content.replace(/^["']|["']$/g, '');
      
      // Check for potential truncation and log warning
      if (content.length < 50 || content.endsWith('...') || !content.endsWith('.') && !content.endsWith('</ul>') && !content.endsWith('</p>')) {
        console.log(`⚠️  Potential truncation detected for ${restaurant.businessName} - ${section.field}: ${content.length} chars`);
      }
      
      // Format content based on field type with proper HTML structure
      if (section.field === 'about' || section.field === 'localContext' || section.field === 'atmosphereDescription') {
        // Handle paragraph content - ensure proper <p> tag formatting
        if (!content.includes('<p>')) {
          // Split by double line breaks and wrap each paragraph in <p> tags
          const paragraphs = content.split(/\n\s*\n/).map(p => p.trim()).filter(p => p);
          content = paragraphs.map(p => `<p>${p}</p>`).join('\n\n');
        }
        // Clean up any malformed HTML and ensure proper spacing
        content = content.replace(/<p>\s*<\/p>/g, '').replace(/\n{3,}/g, '\n\n');
      } else if (['dietaryAccommodations', 'bestTimesToVisit', 'uniqueSellingPoints', 'menuHighlights'].includes(section.field)) {
        // Handle list content - ensure it's properly formatted as HTML list
        if (!content.includes('<ul>') && !content.includes('<li>')) {
          // Convert plain text to HTML list if AI didn't format it properly
          const lines = content.split('\n').filter(line => line.trim());
          const listItems = lines.map(line => {
            const cleanLine = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
            return `<li>${cleanLine}</li>`;
          }).join('\n');
          content = `<ul>\n${listItems}\n</ul>`;
        }
        // Clean up existing HTML lists and ensure proper formatting
        content = content.replace(/<li>\s*<\/li>/g, '').replace(/\n{3,}/g, '\n');
        // Ensure proper list structure
        content = content.replace(/<ul>\s*\n?\s*<li>/g, '<ul>\n<li>').replace(/<\/li>\s*\n?\s*<\/ul>/g, '</li>\n</ul>');
      }
      
      results[section.field] = content;
      
      // Delay between API calls
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
    
  } catch (error) {
    console.error('Error generating rich content:', error.response?.data || error.message);
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

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/us-vegan-restaurants');
    
    console.log('🇺🇸 Processing US vegan restaurants...');
    
    // Find restaurants that need AI-generated rich content
    const restaurantsToUpdate = await Restaurant.find({
      $or: [
        { aiContentGenerated: false },
        { aiContentGenerated: { $exists: false } },
        { about: { $exists: false } },
        { about: null },
        { about: '' },
        { menuHighlights: { $exists: false } },
        { atmosphereDescription: { $exists: false } }
      ],
      aiContentAttempts: { $lt: 3 } // Don't retry more than 3 times
    }).select('businessName address category rating reviewCount priceRange description aiContentAttempts');

    console.log(`\n🔍 Found ${restaurantsToUpdate.length} restaurants that need rich AI content\n`);
    
    if (restaurantsToUpdate.length === 0) {
      console.log('✅ All restaurants already have rich AI content!');
      process.exit(0);
    }

    let processed = 0;
    let successful = 0;
    let rateLimited = 0;
    let errors = 0;

    for (const restaurant of restaurantsToUpdate) {
      try {
        console.log(`Processing ${processed + 1}/${restaurantsToUpdate.length}: ${restaurant.businessName}`);
        
        const richContent = await generateRichContent(restaurant);
        
        // Update restaurant with all rich content
        await Restaurant.findByIdAndUpdate(restaurant._id, {
          ...richContent,
          aiContentGenerated: true,
          aiDescriptionGenerated: true, // Backward compatibility
          $inc: { aiContentAttempts: 1, aiDescriptionAttempts: 1 }
        });
        
        console.log(`✅ Generated rich content for ${restaurant.businessName}`);
        successful++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        if (error.message === 'RATE_LIMITED') {
          console.log(`⏸️  Rate limited for ${restaurant.businessName} - will retry later`);
          rateLimited++;
          
          // Update attempt count
          await Restaurant.findByIdAndUpdate(restaurant._id, {
            $inc: { aiContentAttempts: 1, aiDescriptionAttempts: 1 }
          });
          
          // Wait longer before continuing
          console.log('⏳ Waiting 30 seconds due to rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          
        } else {
          console.log(`❌ Error for ${restaurant.businessName}: ${error.message}`);
          errors++;
          
          // Update attempt count
          await Restaurant.findByIdAndUpdate(restaurant._id, {
            $inc: { aiContentAttempts: 1, aiDescriptionAttempts: 1 }
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

// Rename function for clarity
async function generateRichAIContent() {
  return generateAIDescriptions();
}

generateRichAIContent();