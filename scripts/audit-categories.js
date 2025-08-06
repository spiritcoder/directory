const fs = require('fs');
const path = require('path');

function auditCategories() {
  const dataDir = path.join(__dirname, '../data');
  const categoryCount = {};
  const categoryExamples = {};
  let totalRestaurants = 0;

  // Read all JSON files in data directory
  const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
  
  console.log(`\n🔍 Auditing categories from ${files.length} JSON files...\n`);

  files.forEach(file => {
    const filePath = path.join(dataDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (Array.isArray(data)) {
      data.forEach(restaurant => {
        totalRestaurants++;
        const category = restaurant.category;
        
        if (category) {
          // Count categories
          categoryCount[category] = (categoryCount[category] || 0) + 1;
          
          // Store examples
          if (!categoryExamples[category]) {
            categoryExamples[category] = [];
          }
          if (categoryExamples[category].length < 3) {
            categoryExamples[category].push(restaurant.businessName);
          }
        } else {
          // Track restaurants without categories
          categoryCount['[NO CATEGORY]'] = (categoryCount['[NO CATEGORY]'] || 0) + 1;
        }
      });
    }
  });

  // Sort categories by count (descending)
  const sortedCategories = Object.entries(categoryCount)
    .sort(([,a], [,b]) => b - a);

  console.log(`📊 CATEGORY AUDIT RESULTS`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Total Restaurants: ${totalRestaurants}`);
  console.log(`Unique Categories: ${Object.keys(categoryCount).length}\n`);

  console.log(`📋 CATEGORIES BY FREQUENCY:`);
  console.log(`─────────────────────────────────────────`);
  
  sortedCategories.forEach(([category, count], index) => {
    const percentage = ((count / totalRestaurants) * 100).toFixed(1);
    const examples = categoryExamples[category] ? 
      categoryExamples[category].slice(0, 2).join(', ') : '';
    
    console.log(`${(index + 1).toString().padStart(2)}. ${category.padEnd(25)} | ${count.toString().padStart(3)} (${percentage}%) | ${examples}`);
  });

  // Identify potential duplicates
  console.log(`\n🔍 POTENTIAL DUPLICATES TO HARMONIZE:`);
  console.log(`─────────────────────────────────────────`);
  
  const categories = Object.keys(categoryCount);
  const potentialDuplicates = [];
  
  categories.forEach(cat1 => {
    categories.forEach(cat2 => {
      if (cat1 !== cat2 && cat1.toLowerCase().includes(cat2.toLowerCase()) || 
          cat2.toLowerCase().includes(cat1.toLowerCase()) ||
          (cat1.toLowerCase().replace(/[^a-z]/g, '') === cat2.toLowerCase().replace(/[^a-z]/g, '') && cat1 !== cat2)) {
        const pair = [cat1, cat2].sort().join(' + ');
        if (!potentialDuplicates.includes(pair)) {
          potentialDuplicates.push(pair);
        }
      }
    });
  });

  potentialDuplicates.forEach(pair => {
    const [cat1, cat2] = pair.split(' + ');
    console.log(`• "${cat1}" (${categoryCount[cat1]}) + "${cat2}" (${categoryCount[cat2]})`);
  });

  // Categories with very few restaurants
  console.log(`\n📉 CATEGORIES WITH ≤3 RESTAURANTS (consider merging):`);
  console.log(`─────────────────────────────────────────`);
  
  sortedCategories
    .filter(([category, count]) => count <= 3 && category !== '[NO CATEGORY]')
    .forEach(([category, count]) => {
      console.log(`• "${category}" (${count}) - Examples: ${categoryExamples[category]?.join(', ') || 'None'}`);
    });

  console.log(`\n✅ Audit complete! Use this data to create harmonization mapping.\n`);
}

auditCategories();