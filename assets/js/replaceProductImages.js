/**
 * Category Icons Image Replacement
 * এটি সব জায়গায় প্রোডাক্ট ইমেজ দেখানোর জায়গায় ক্যাটাগরি আইকন দেখাবে
 */

(function() {
  'use strict';

  // ক্যাটাগরি নাম থেকে আইকন ফাইলনেম ম্যাপিং
  const categoryIconMapping = {
    // প্রতিটি ক্যাটাগরির জন্য সব সম্ভাব্য নাম
    "Physical Products": "Physical%20Product.png",
    "Physical product": "Physical%20Product.png",
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
    "Csmize gift": "Csmize%20gift.png",
    "Creative & Design Tools": "stw&licance.png",
    "Learning & Education": "Learning&education.png",
    "Learning Education": "Learning&education.png",
    "AI & Productivity": "Ai&Productivity.png",
    "Business & Career": "Bussiness&carrier.png",
    "Streaming & Entertainment": "stw&licance.png",
    "Software & Licenses": "Software&licneces.png",
    "Communication & Tools": "dg%20product.png"
  };

  /**
   * ক্যাটাগরি নাম থেকে আইকন পাথ পান
   */
  function getCategoryIconPath(categoryName) {
    if (!categoryName) {
      return "../assets/images/category/Physical%20Product.png";
    }

    // সঠিক ম্যাচ চেক করুন
    if (categoryIconMapping[categoryName]) {
      return `../assets/images/category/${categoryIconMapping[categoryName]}`;
    }

    // কেস-ইনসেনসিটিভ ম্যাচ চেক করুন
    for (const [key, icon] of Object.entries(categoryIconMapping)) {
      if (key.toLowerCase() === categoryName.toLowerCase()) {
        return `../assets/images/category/${icon}`;
      }
    }

    // ডিফল্ট
    return "../assets/images/category/Physical%20Product.png";
  }

  /**
   * সব প্রোডাক্ট ইমেজকে ক্যাটাগরি আইকন দিয়ে রিপ্লেস করুন
   */
  function replaceProductImages() {
    // API থেকে আসা ইমেজগুলি - যদি category_icon থাকে তো সেটা ব্যবহার করুন
    document.querySelectorAll('img[data-category-name]').forEach(img => {
      const categoryName = img.getAttribute('data-category-name');
      if (categoryName) {
        img.src = getCategoryIconPath(categoryName);
      }
    });

    // স্ট্যাটিক প্রোডাক্ট ইমেজগুলি (যদি data-replace-with-category থাকে)
    document.querySelectorAll('img[data-replace-with-category]').forEach(img => {
      const categoryName = img.getAttribute('data-replace-with-category');
      if (categoryName) {
        img.src = getCategoryIconPath(categoryName);
        img.alt = categoryName;
      }
    });
  }

  /**
   * ডায়নামিক প্রোডাক্টের জন্য এপিআই রেসপন্স প্রসেস করুন
   */
  window.processProductsWithIcons = function(products) {
    return products.map(product => {
      if (product.category_name) {
        product.category_icon_path = getCategoryIconPath(product.category_name);
      }
      return product;
    });
  };

  /**
   * ইমেজ ট্যাগ তৈরি করুন ক্যাটাগরি আইকন দিয়ে
   */
  window.createCategoryIconImg = function(categoryName, alt = "", className = "") {
    const img = document.createElement('img');
    img.src = getCategoryIconPath(categoryName);
    img.alt = alt || categoryName;
    if (className) img.className = className;
    return img;
  };

  /**
   * ক্যাটাগরি আইকন পথ পান (ডাইরেক্ট ব্যবহারের জন্য)
   */
  window.getCategoryIconPath = getCategoryIconPath;

  // পেজ লোড হওয়ার পর চালান
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceProductImages);
  } else {
    replaceProductImages();
  }

  // মিউটেশন অবজারভার - নতুন ইমেজ যোগ হলে তাদেরও রিপ্লেস করুন
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        replaceProductImages();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });

  console.log('✅ Category Icons Image Replacement loaded successfully!');
})();
