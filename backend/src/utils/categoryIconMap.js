// Category Icon Mapping - Maps category names to icon file paths
const categoryIconMap = {
  // Main categories (matching actual file names)
  "Physical Products": "Physical Product.png",
  "Physical product": "Physical Product.png",
  
  "Digital Products": "Digital-Product.png",
  "Digital product": "Digital-Product.png",
  
  "Men's Fashion": "Mens-fashion.png",
  "Mens-fashion": "Mens-fashion.png",
  
  "Women's Fashion": "woman's-fashion.png",
  "womans-fashion": "woman's-fashion.png",
  
  "Home & Lifestyle": "H.png",
  
  "Gadgets & Electronics": "Gadget&Electronic.png",
  "Gadgets Electronics": "Gadget&Electronic.png",
  
  "Kids' Zone": "kidszone.png",
  "Kids Zone": "kidszone.png",
  
  "Customized Gifts": "Customize-gift.png",
  "Customize gift": "Customize-gift.png",
  "Csmize gift": "Csmize gift.png",
  
  "Creative & Design Tools": "stw&licance.png",
  
  "Learning & Education": "Learning&education.png",
  "Learning Education": "Learning&education.png",
  
  "AI & Productivity": "Ai&Productivity.png",
  
  "Business & Career": "Bussiness&carrier.png",
  
  "Streaming & Entertainment": "stw&licance.png",
  
  "Software & Licenses": "Software&licneces.png",
  
  "Communication & Tools": "dg product.png"
};

/**
 * Get icon filename for a category name
 * @param {string} categoryName - The name of the category
 * @returns {string} - The icon filename
 */
function getIconForCategory(categoryName) {
  if (!categoryName) return "Physical-Product.png"; // Default icon
  
  // Try direct match first
  if (categoryIconMap[categoryName]) {
    return categoryIconMap[categoryName];
  }
  
  // Try case-insensitive match
  const lowerName = categoryName.toLowerCase();
  for (const [key, icon] of Object.entries(categoryIconMap)) {
    if (key.toLowerCase() === lowerName) {
      return icon;
    }
  }
  
  // Default fallback
  return "Physical-Product.png";
}

/**
 * Get full icon path for a category
 * @param {string} categoryName - The name of the category
 * @returns {string} - The full path to the icon
 */
function getIconPath(categoryName) {
  const iconFilename = getIconForCategory(categoryName);
  return `../assets/images/category/${iconFilename}`;
}

module.exports = {
  categoryIconMap,
  getIconForCategory,
  getIconPath
};
