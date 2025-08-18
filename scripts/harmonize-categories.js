const fs = require('fs');
const path = require('path');

// Category harmonization mapping
const categoryMapping = {
  // Remove generic terms - convert to specific cuisines
  'Restaurant': 'Casual Dining',
  'Vegan restaurant': 'Casual Dining',
  'Vegetarian restaurant': 'Casual Dining',
  
  // Indian cuisine consolidation
  'North Indian restaurant': 'Indian',
  'South Indian restaurant': 'Indian',
  'Modern Indian restaurant': 'Indian',
  'Indian restaurant': 'Indian',
  'Indian takeaway': 'Indian',
  
  // American cuisine consolidation
  'American restaurant': 'American',
  'New American restaurant': 'American',
  'Southern restaurant (US)': 'American',
  'Southwestern restaurant (US)': 'American',
  'Californian restaurant': 'American',
  'Pacific Northwest restaurant (US)': 'American',
  
  // Asian cuisine consolidation
  'Asian restaurant': 'Asian',
  'Asian fusion restaurant': 'Asian',
  'Pan-Asian restaurant': 'Asian',
  'Southeast Asian restaurant': 'Asian',
  
  // African cuisine consolidation
  'African restaurant': 'African',
  'East African restaurant': 'African',
  'West African restaurant': 'African',
  
  // European consolidation
  'European restaurant': 'European',
  'Eastern European restaurant': 'European',
  
  // Coffee & Cafe consolidation
  'Coffee shop': 'Cafe',
  'Art cafe': 'Cafe',
  
  // Bar consolidation
  'Bar': 'Bar & Grill',
  'Wine bar': 'Bar & Grill',
  'Cocktail bar': 'Bar & Grill',
  'Live music bar': 'Bar & Grill',
  'Gastropub': 'Bar & Grill',
  
  // Fast Food consolidation
  'Fast food restaurant': 'Fast Food',
  'Takeout restaurant': 'Fast Food',
  'Hamburger restaurant': 'Fast Food',
  'Hot dog restaurant': 'Fast Food',
  'Hot dog stand': 'Fast Food',
  'Burrito restaurant': 'Fast Food',
  
  // Pizza consolidation
  'Pizza restaurant': 'Pizza',
  'Pizza takeaway': 'Pizza',
  
  // Health Food consolidation
  'Health food restaurant': 'Health Food',
  'Health food store': 'Health Food',
  'Organic restaurant': 'Health Food',
  'Gluten-free restaurant': 'Health Food',
  'Raw food restaurant': 'Health Food',
  'Macrobiotic restaurant': 'Health Food',
  
  // Breakfast/Brunch consolidation
  'Breakfast restaurant': 'Breakfast & Brunch',
  'Brunch restaurant': 'Breakfast & Brunch',
  'Lunch restaurant': 'Breakfast & Brunch',
  
  // Fine Dining
  'Fine dining restaurant': 'Fine Dining',
  'Bistro': 'Fine Dining',
  'Small plates restaurant': 'Fine Dining',
  
  // Bakery & Desserts
  'Bakery': 'Bakery & Desserts',
  'Dessert shop': 'Bakery & Desserts',
  'Ice cream shop': 'Bakery & Desserts',
  'Creperie': 'Bakery & Desserts',
  
  // Juice & Smoothies
  'Juice shop': 'Juice & Smoothies',
  'Açaí shop': 'Juice & Smoothies',
  
  // Noodles & Ramen
  'Noodle shop': 'Noodles & Ramen',
  'Ramen restaurant': 'Noodles & Ramen',
  'Soba noodle shop': 'Noodles & Ramen',
  
  // Japanese consolidation
  'Japanese restaurant': 'Japanese',
  'Authentic Japanese restaurant': 'Japanese',
  'Modern izakaya restaurant': 'Japanese',
  'Sushi restaurant': 'Japanese',
  
  // Chinese & Korean separate
  'Chinese restaurant': 'Chinese',
  'Korean restaurant': 'Korean',
  
  // Thai, Vietnamese separate (popular enough)
  'Thai restaurant': 'Thai',
  'Vietnamese restaurant': 'Vietnamese',
  
  // Mediterranean & Middle Eastern
  'Mediterranean restaurant': 'Mediterranean',
  'Middle Eastern restaurant': 'Mediterranean',
  'Lebanese restaurant': 'Mediterranean',
  'Greek restaurant': 'Mediterranean',
  'Israeli restaurant': 'Mediterranean',
  'Persian restaurant': 'Mediterranean',
  'Palestinian restaurant': 'Mediterranean',
  
  // Mexican & Latin American
  'Mexican restaurant': 'Mexican',
  'Latin American restaurant': 'Mexican',
  'Central American restaurant': 'Mexican',
  
  // Italian
  'Italian restaurant': 'Italian',
  
  // Ethiopian (popular in vegan community)
  'Ethiopian restaurant': 'Ethiopian',
  'Eritrean restaurant': 'Ethiopian',
  
  // Caribbean
  'Caribbean restaurant': 'Caribbean',
  'Jamaican restaurant': 'Caribbean',
  'Haitian restaurant': 'Caribbean',
  
  // Comfort Food
  'Soul food restaurant': 'Comfort Food',
  'Diner': 'Comfort Food',
  'Family restaurant': 'Comfort Food',
  'Buffet restaurant': 'Comfort Food',
  'Steak house': 'Comfort Food',
  
  // Specialty categories to keep as-is
  'Caterer': 'Catering',
  'Mobile caterer': 'Catering',
  'Catering food and drink supplier': 'Catering',
  'Personal chef service': 'Catering',
  
  // Services (non-restaurant)
  'Meal delivery': 'Food Service',
  'Delivery service': 'Food Service',
  'Food producer': 'Food Service',
  'Food products supplier': 'Food Service',
  'Food manufacturer': 'Food Service',
  'Manufacturer': 'Food Service',
  'Cheese manufacturer': 'Food Service',
  
  // Retail
  'Grocery store': 'Retail',
  'Gourmet grocery store': 'Retail',
  'Health food store': 'Retail',
  'Natural goods store': 'Retail',
  'Store': 'Retail',
  'Market': 'Retail',
  
  // Remove non-restaurant categories (assign to 'Other')
  'Business networking company': 'Other',
  'Event planner': 'Other',
  'Festival': 'Other',
  'Tourist information center': 'Other',
  'Social club': 'Other',
  'Cultural center': 'Other',
  'Naturopathic practitioner': 'Other',
  'Trading card store': 'Other',
  'Winery': 'Other',
  'Distribution service': 'Other',
  'Shared-use commercial kitchen': 'Other',
  'Tea house': 'Other'
};

function getDataFolders() {
  const baseDir = path.join(__dirname, '..');
  return fs.readdirSync(baseDir)
    .filter(item => {
      const fullPath = path.join(baseDir, item);
      return fs.statSync(fullPath).isDirectory() && item.startsWith('data-');
    });
}

function harmonizeCategories() {
  const dataFolders = getDataFolders();
  let totalUpdated = 0;
  let categoryStats = {};
  let totalFiles = 0;
  
  console.log(`\n📁 Found data folders: ${dataFolders.join(', ')}`);
  
  dataFolders.forEach(folder => {
    const folderPath = path.join(__dirname, '..', folder);
    if (!fs.existsSync(folderPath)) {
      console.log(`⚠️  Folder ${folder} not found, skipping...`);
      return;
    }
    
    const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.json'));
    totalFiles += files.length;
    console.log(`\n🔄 Harmonizing ${folder}: ${files.length} files`);
    
    files.forEach(file => {
      const filePath = path.join(folderPath, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let fileUpdated = false;
      
      if (Array.isArray(data)) {
        data.forEach(restaurant => {
          const oldCategory = restaurant.category;
          
          if (oldCategory && categoryMapping[oldCategory]) {
            restaurant.category = categoryMapping[oldCategory];
            totalUpdated++;
            fileUpdated = true;
            
            // Track new categories
            const newCategory = restaurant.category;
            categoryStats[newCategory] = (categoryStats[newCategory] || 0) + 1;
            
            console.log(`  ${restaurant.businessName}: "${oldCategory}" → "${newCategory}"`);
          } else if (oldCategory) {
            // Keep unmapped categories as-is
            categoryStats[oldCategory] = (categoryStats[oldCategory] || 0) + 1;
          }
        });
      }
      
      // Write back if updated
      if (fileUpdated) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ Updated ${file}`);
      }
    });
  });
  
  console.log(`\n📊 HARMONIZATION COMPLETE`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Total files processed: ${totalFiles}`);
  console.log(`Total restaurants updated: ${totalUpdated}`);
  console.log(`\n📋 NEW CATEGORY DISTRIBUTION:`);
  console.log(`─────────────────────────────────────────`);
  
  // Sort by count
  const sortedStats = Object.entries(categoryStats)
    .sort(([,a], [,b]) => b - a);
  
  sortedStats.forEach(([category, count], index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${category.padEnd(25)} | ${count.toString().padStart(4)} restaurants`);
  });
  
  console.log(`\n✅ Harmonization complete! Categories reduced to ${sortedStats.length}\n`);
}

harmonizeCategories();