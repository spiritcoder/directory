const mongoose = require('mongoose');
const TattooShop = require('../models/TattooShop');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Removed data folder detection - now US-only focused

async function generateRichContent(tattooShop) {
  try {
    const basePrompt = `Generate comprehensive content for this US tattoo shop:

Name: ${tattooShop.businessName}
Category: ${tattooShop.category}
Location: ${tattooShop.address?.city}, ${tattooShop.address?.state}
Price Range: ${tattooShop.priceRange || 'Not specified'}
Rating: ${tattooShop.rating}/5 (${tattooShop.reviewCount} reviews)
Existing details: ${tattooShop.description || 'No additional details'}`;
    
    const sections = [
      {
        field: 'about',
        prompt: `${basePrompt}\n\nWrite a comprehensive 3-paragraph description (250-300 words total). Format your response EXACTLY like this:\n\n<p>Opening paragraph: atmosphere, ambiance, and first impressions</p>\n\n<p>Middle paragraph: artist skills, tattoo styles, and signature work</p>\n\n<p>Closing paragraph: service, value, and overall experience</p>\n\nWrite in engaging, natural language. Use proper <p> tags for each paragraph with line breaks between them. Keep to exactly 250-300 words.`
      },
      {
        field: 'artistSpecialties',
        prompt: `${basePrompt}\n\nList 5-7 artist specialties and tattoo styles (120-150 words total). Format your response EXACTLY like this:\n\n<ul>\n<li>Style name - brief description</li>\n<li>Style name - brief description</li>\n<li>Style name - brief description</li>\n</ul>\n\nInclude variety (traditional, realism, watercolor, blackwork, etc). Be specific about techniques and artistic approaches. Keep each item description to 20-25 words.`
      },
      {
        field: 'atmosphereDescription',
        prompt: `${basePrompt}\n\nDescribe the tattoo shop's atmosphere in 2-3 paragraphs (150-200 words total). Format your response EXACTLY like this:\n\n<p>First paragraph about decor style, lighting, and overall vibe</p>\n\n<p>Second paragraph about cleanliness, equipment, and ambiance details</p>\n\nMake it vivid and appealing. Use proper <p> tags with line breaks between paragraphs. Keep to exactly 150-200 words.`
      },
      {
        field: 'piercingServices',
        prompt: `${basePrompt}\n\nList exactly 4 piercing services offered. Each item must be exactly 12-15 words. Format your response EXACTLY like this:\n\n<ul>\n<li>Ear Piercings - [exactly 12-15 words describing ear piercing options and jewelry selection]</li>\n<li>Facial Piercings - [exactly 12-15 words about nose, lip, eyebrow piercing services]</li>\n<li>Body Piercings - [exactly 12-15 words about navel, tongue, and other body piercings]</li>\n<li>Custom Jewelry - [exactly 12-15 words about jewelry options and custom pieces available]</li>\n</ul>\n\nTotal response must be exactly 60-75 words. Be precise with word counts.`
      },
      {
        field: 'bestTimesToVisit',
        prompt: `${basePrompt}\n\nSuggest 3-4 optimal times to visit (80-100 words total). Format your response EXACTLY like this:\n\n<ul>\n<li>Time period - brief reason why it's ideal</li>\n<li>Time period - brief reason why it's ideal</li>\n<li>Time period - brief reason why it's ideal</li>\n</ul>\n\nFocus on timing like "Weekday afternoons", "Saturday mornings", "Evening appointments", "Walk-in hours". Keep each item to 20-25 words.`
      },
      {
        field: 'uniqueSellingPoints',
        prompt: `${basePrompt}\n\nIdentify 3-4 unique aspects that set this tattoo shop apart (100-120 words total). Format your response EXACTLY like this:\n\n<ul>\n<li>Unique aspect - detailed description</li>\n<li>Unique aspect - detailed description</li>\n<li>Unique aspect - detailed description</li>\n</ul>\n\nInclude artist backgrounds, specializations, equipment, awards, custom work, etc. Keep each description to 25-30 words.`
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
      if (section.field === 'about') maxTokens = 550; // 250-300 words
      if (section.field === 'atmosphereDescription') maxTokens = 300; // 150-200 words
      if (section.field === 'localContext') maxTokens = 300; // 150-200 words
      if (section.field === 'artistSpecialties') maxTokens = 350; // 120-150 words + HTML formatting
      if (section.field === 'uniqueSellingPoints') maxTokens = 350; // 100-120 words + HTML formatting
      if (section.field === 'piercingServices') maxTokens = 250; // 80-100 words + HTML formatting
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
        console.log(`⚠️  Potential truncation detected for ${tattooShop.businessName} - ${section.field}: ${content.length} chars`);
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
      } else if (['piercingServices', 'bestTimesToVisit', 'uniqueSellingPoints', 'artistSpecialties'].includes(section.field)) {
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

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/us-tattoo-shops');
    
    console.log('🇺🇸 Processing US tattoo shops...');
    
    // Find tattoo shops that need AI-generated rich content
    const shopsToUpdate = await TattooShop.find({
      $or: [
        { aiContentGenerated: false },
        { aiContentGenerated: { $exists: false } },
        { about: { $exists: false } },
        { about: null },
        { about: '' },
        { artistSpecialties: { $exists: false } },
        { atmosphereDescription: { $exists: false } }
      ],
      aiContentAttempts: { $lt: 3 } // Don't retry more than 3 times
    }).select('businessName address category rating reviewCount priceRange description aiContentAttempts');

    console.log(`\n🔍 Found ${shopsToUpdate.length} tattoo shops that need rich AI content\n`);
    
    if (shopsToUpdate.length === 0) {
      console.log('✅ All tattoo shops already have rich AI content!');
      process.exit(0);
    }

    let processed = 0;
    let successful = 0;
    let rateLimited = 0;
    let errors = 0;

    for (const tattooShop of shopsToUpdate) {
      try {
        console.log(`Processing ${processed + 1}/${shopsToUpdate.length}: ${tattooShop.businessName}`);
        
        const richContent = await generateRichContent(tattooShop);
        
        // Update tattoo shop with all rich content
        await TattooShop.findByIdAndUpdate(tattooShop._id, {
          ...richContent,
          aiContentGenerated: true,
          aiDescriptionGenerated: true, // Backward compatibility
          $inc: { aiContentAttempts: 1, aiDescriptionAttempts: 1 }
        });
        
        console.log(`✅ Generated rich content for ${tattooShop.businessName}`);
        successful++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        if (error.message === 'RATE_LIMITED') {
          console.log(`⏸️  Rate limited for ${tattooShop.businessName} - will retry later`);
          rateLimited++;
          
          // Update attempt count
          await TattooShop.findByIdAndUpdate(tattooShop._id, {
            $inc: { aiContentAttempts: 1, aiDescriptionAttempts: 1 }
          });
          
          // Wait longer before continuing
          console.log('⏳ Waiting 30 seconds due to rate limiting...');
          await new Promise(resolve => setTimeout(resolve, 30000));
          
        } else {
          console.log(`❌ Error for ${tattooShop.businessName}: ${error.message}`);
          errors++;
          
          // Update attempt count
          await TattooShop.findByIdAndUpdate(tattooShop._id, {
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
      console.log(`\n💡 ${rateLimited} tattoo shops were rate limited. Run this script again to retry them.`);
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