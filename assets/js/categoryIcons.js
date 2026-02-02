// Category Icon Mapping for Frontend
// This file helps display category icons instead of product images

const categoryIconMapping = {
  // Primary categories
  "Physical Products": "Physical-Product.png",
  "Digital Products": "Digital-Product.png",
  "Men's Fashion": "Mens-fashion.png",
  "Women's Fashion": "woman's-fashion.png",
  "Home & Lifestyle": "H.png",
  "Gadgets & Electronics": "Gadget&Electronic.png",
  "Kids' Zone": "kidszone.png",
  "Customized Gifts": "Customize-gift.png",
  "Creative & Design Tools": "stw&licance.png",
  "Learning & Education": "Learning&education.png",
  "AI & Productivity": "Ai&Productivity.png",
  "Business & Career": "Bussiness&carrier.png",
  "Streaming & Entertainment": "stw&licance.png",
  "Software & Licenses": "Software&licneces.png",
  "Communication & Tools": "dg product.png"
};

/**
 * Get icon filename for a category
 */
function getCategoryIcon(categoryName) {
  if (!categoryName) return "Physical-Product.png";
  
  // Try exact match
  if (categoryIconMapping[categoryName]) {
    return categoryIconMapping[categoryName];
  }
  
  // Try case-insensitive match
  for (const [key, icon] of Object.entries(categoryIconMapping)) {
    if (key.toLowerCase() === categoryName.toLowerCase()) {
      return icon;
    }
  }
  
  return "Physical-Product.png"; // Default
}

/**
 * Get full icon path for a category
 */
function getCategoryIconPath(categoryName) {
  const icon = getCategoryIcon(categoryName);
  return `../assets/images/category/${icon}`;
}

/**
 * Replace product image src with category icon
 * Used when rendering products dynamically
 */
function applyProductImages(productsArray) {
  if (!Array.isArray(productsArray)) return;
  
  productsArray.forEach(product => {
    if (product.category_name) {
      product.category_icon = getCategoryIcon(product.category_name);
    }
  });
  
  return productsArray;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getCategoryIcon,
    getCategoryIconPath,
    applyProductImages
  };
}
