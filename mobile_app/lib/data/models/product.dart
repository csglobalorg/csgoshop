class Product {
  final String id;
  final String name;
  final String category;
  final String? subcategory;
  final String? subType;
  final String? thumbnailImg;
  final double price; // Selling price — what customers pay
  final double originalPrice; // Auto-generated fake MRP (higher than price)
  final String? details;
  final String provider;
  final bool isFeatured;
  final bool isTrending;
  final List<String> images;
  final List<dynamic> variants;

  Product({
    required this.id,
    required this.name,
    required this.category,
    this.subcategory,
    this.subType,
    this.thumbnailImg,
    required this.price,
    required this.originalPrice,
    this.details,
    required this.provider,
    required this.isFeatured,
    required this.isTrending,
    required this.images,
    required this.variants,
  });

  /// Calculates the discount percentage between originalPrice and selling price
  int get discountPercent {
    if (originalPrice <= price || price <= 0) return 0;
    return ((originalPrice - price) / originalPrice * 100).round();
  }

  /// Generates a seed from the product ID for consistent fake pricing
  static int seedFromId(String id) {
    return id.codeUnits.fold(0, (acc, char) => acc + char);
  }

  static String? getOptimizedImageUrl(String? url) {
    if (url == null || url.isEmpty) return null;
    String finalUrl = url.trim();

    // Handle protocol-relative URLs
    if (finalUrl.startsWith('//')) {
      finalUrl = 'https:$finalUrl';
    }

    // 1. Handle relative paths for known providers
    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('data:')) {
      if (finalUrl.contains('uploads/') || finalUrl.contains('product/') || finalUrl.contains('images/')) {
        finalUrl = 'https://mohasagor.com.bd/${finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl}';
      } else if (finalUrl.length > 5) {
        finalUrl = 'https://mohasagor.com.bd/${finalUrl.startsWith('/') ? finalUrl.substring(1) : finalUrl}';
      }
    }

    if (!finalUrl.startsWith('http')) return finalUrl;

    // 2. Upgrade http to https to avoid mixed content issues
    if (finalUrl.startsWith('http:')) {
      finalUrl = finalUrl.replaceFirst('http:', 'https:');
    }

    // 3. Proxy Mohasagor and Merrono URLs via wsrv.nl to bypass hotlinking protection
    if (finalUrl.contains('mohasagor.com.bd') || finalUrl.contains('merrono.com')) {
      return 'https://wsrv.nl/?url=${Uri.encodeComponent(finalUrl)}&default=https://via.placeholder.com/400';
    }

    // 4. Clean URL to get HD original version ONLY for known Daraz/Alibaba CDNs
    final isDarazAlibaba = RegExp(r'daraz|alicdn|alibaba|lazada', caseSensitive: false).hasMatch(finalUrl);
    if (isDarazAlibaba) {
      finalUrl = finalUrl
          .replaceAll(RegExp(r'_S_\d+x\d+'), '')
          .replaceAll(RegExp(r'_S(?=\.)'), '')
          .replaceAll(RegExp(r'_\d+x\d+'), '');
    }

    return finalUrl;
  }

  /// Auto-generates a realistic "original" price (MRP) with 25-45% markup
  /// Uses a seed-based approach for consistency (same product always gets same markup)
  static double _generateOriginalPrice(double sellingPrice, String id) {
    if (sellingPrice <= 0) return 0;
    final seed = seedFromId(id);
    final markupPercent = 25 + (seed % 21); // 25% to 45%
    final fakeOriginal = (sellingPrice * (1 + markupPercent / 100) / 10).ceil() * 10.0;
    return fakeOriginal;
  }

  static final Map<String, List<String>> _subcategoriesMap = {
    "Offer": ["Stock Clearance Sale", "Mystery Box", "Big Offer", "Full Sleeve Shirt"],
    "Men's Fashion": ["Panjabi", "Pajama", "T-Shirt", "Shirts", "Pants", "Men's Accessories", "Jersey"],
    "Women's Fashion": ["Sharee", "Salwar", "Kurti", "Borka", "Women's Accessories", "Cosmetics"],
    "Home & Lifestyle": ["Bed Sheet", "Home Appliance", "Kitchen", "Health"],
    "Gadgets & Electronics": ["Mobile Accessories", "Computer", "Audio", "Power Bank", "Trimmer"],
    "Kids Zone": ["Toys", "Baby", "Children"],
    "Customize & Gift": ["Gift", "Customize"]
  };

  static final Map<String, List<Map<String, dynamic>>> _subTypeRules = {
    "Sharee": [
      {"label": "Jamdani", "keywords": ["jamdani", "জামদানি"]},
      {"label": "Half Silk", "keywords": ["half silk", "halk silk", "half-silk", "half_silk"]},
      {"label": "Silk", "keywords": ["silk", "silky"]},
      {"label": "Cotton", "keywords": ["cotton", "khadi"]},
      {"label": "Georgette", "keywords": ["georgette", "jorget"]},
      {"label": "Muslin", "keywords": ["muslin", "মসলিন"]},
      {"label": "Voile", "keywords": ["voile", "voil"]},
      {"label": "Chiffon", "keywords": ["chiffon", "crepe"]},
      {"label": "Linen", "keywords": ["linen"]},
      {"label": "Katan", "keywords": ["katan", "kataan"]},
      {"label": "Tant", "keywords": ["tant", "taant"]},
    ],
    "Salwar": [
      {"label": "Three Piece", "keywords": ["three piece", "3 piece", "3piece"]},
      {"label": "Two Piece", "keywords": ["two piece", "2 piece", "2piece"]},
      {"label": "Embroidery", "keywords": ["embroidery", "embroidered", "nakshi"]},
      {"label": "Printed", "keywords": ["printed", "print"]},
      {"label": "Cotton", "keywords": ["cotton"]},
      {"label": "Georgette", "keywords": ["georgette"]},
    ],
    "Kurti": [
      {"label": "Cotton Kurti", "keywords": ["cotton"]},
      {"label": "Printed Kurti", "keywords": ["printed", "print"]},
      {"label": "Embroidery", "keywords": ["embroidery", "nakshi"]},
      {"label": "Tops", "keywords": ["tops", "top"]},
    ],
    "Borka": [
      {"label": "Hijab", "keywords": ["hijab"]},
      {"label": "Abaya", "keywords": ["abaya"]},
      {"label": "Niqab", "keywords": ["niqab"]},
      {"label": "Full Borka", "keywords": ["borka", "burka", "burkha"]},
    ],
    "Cosmetics": [
      {"label": "Cream", "keywords": ["cream", "lotion", "moisturizer"]},
      {"label": "Makeup", "keywords": ["makeup", "lipstick", "foundation", "blush"]},
      {"label": "Skincare", "keywords": ["serum", "toner", "sunscreen", "facewash"]},
      {"label": "Hair Care", "keywords": ["shampoo", "conditioner", "hair oil", "hair"]},
      {"label": "Perfume", "keywords": ["perfume", "attar", "fragrance", "deodorant"]},
    ],
    "Panjabi": [
      {"label": "Cotton Panjabi", "keywords": ["cotton"]},
      {"label": "Silk Panjabi", "keywords": ["silk"]},
      {"label": "Embroidery", "keywords": ["embroidery", "nakshi", "embroidered"]},
      {"label": "Linen Panjabi", "keywords": ["linen"]},
      {"label": "Printed", "keywords": ["printed", "print"]},
    ],
    "T-Shirt": [
      {"label": "Polo", "keywords": ["polo"]},
      {"label": "Round Neck", "keywords": ["round neck", "crew neck"]},
      {"label": "V-Neck", "keywords": ["v-neck", "v neck"]},
      {"label": "Full Sleeve", "keywords": ["full sleeve", "full-sleeve", "long sleeve"]},
      {"label": "Half Sleeve", "keywords": ["half sleeve", "short sleeve"]},
      {"label": "Printed", "keywords": ["printed", "print", "graphic"]},
      {"label": "Plain", "keywords": ["plain", "solid", "basic"]},
    ],
    "Shirts": [
      {"label": "Casual Shirt", "keywords": ["casual"]},
      {"label": "Formal Shirt", "keywords": ["formal", "office"]},
      {"label": "Check Shirt", "keywords": ["check", "plaid", "stripe"]},
      {"label": "Printed Shirt", "keywords": ["printed", "print"]},
      {"label": "Linen Shirt", "keywords": ["linen"]},
    ],
    "Pants": [
      {"label": "Jeans", "keywords": ["jeans", "denim"]},
      {"label": "Gabardine", "keywords": ["gabardine"]},
      {"label": "Trouser", "keywords": ["trouser", "formal pant"]},
      {"label": "Chino", "keywords": ["chino", "khaki"]},
      {"label": "Cargo", "keywords": ["cargo"]},
    ],
    "Jersey": [
      {"label": "Football Jersey", "keywords": ["football", "soccer"]},
      {"label": "Cricket Jersey", "keywords": ["cricket"]},
      {"label": "Basketball", "keywords": ["basketball", "nba"]},
      {"label": "Sports Wear", "keywords": ["sports", "athletic", "gym"]},
    ],
    "Mobile Accessories": [
      {"label": "Phone Case/Cover", "keywords": ["cover", "case", "back cover", "casing"]},
      {"label": "Charger/Cable", "keywords": ["charger", "cable", "adapter", "data cable"]},
      {"label": "Screen Guard", "keywords": ["screen", "tempered", "protector", "glass"]},
      {"label": "Stand/Holder", "keywords": ["stand", "holder", "mount", "grip"]},
      {"label": "OTG/USB", "keywords": ["otg", "usb", "hub"]},
    ],
    "Audio": [
      {"label": "Earphone", "keywords": ["earphone", "earbud", "in-ear"]},
      {"label": "Headphone", "keywords": ["headphone", "headset", "over-ear"]},
      {"label": "Bluetooth Speaker", "keywords": ["speaker", "bluetooth speaker"]},
      {"label": "Airpods/TWS", "keywords": ["airpods", "tws", "true wireless"]},
      {"label": "Neckband", "keywords": ["neckband", "neck band"]},
    ],
    "Computer": [
      {"label": "Mouse", "keywords": ["mouse"]},
      {"label": "Keyboard", "keywords": ["keyboard"]},
      {"label": "Pendrive/SSD", "keywords": ["pendrive", "pen drive", "ssd", "flash drive"]},
      {"label": "Webcam", "keywords": ["webcam", "web camera"]},
      {"label": "Router/Networking", "keywords": ["router", "wifi", "network", "modem"]},
    ],
    "Trimmer": [
      {"label": "Beard Trimmer", "keywords": ["beard", "shaver", "trimmer"]},
      {"label": "Hair Clipper", "keywords": ["hair clipper", "clipper"]},
      {"label": "Lady Shaver", "keywords": ["lady", "women", "bikini"]},
      {"label": "Nose/Ear Trimmer", "keywords": ["nose", "ear"]},
    ],
    "Bed Sheet": [
      {"label": "Single Bed", "keywords": ["single", "twin"]},
      {"label": "Double Bed", "keywords": ["double", "queen", "king"]},
      {"label": "Pillow Cover", "keywords": ["pillow", "cushion"]},
      {"label": "Comforter/Blanket", "keywords": ["comforter", "blanket", "duvet"]},
      {"label": "Mattress Cover", "keywords": ["mattress", "bedcover"]},
    ],
    "Kitchen": [
      {"label": "Cookware", "keywords": ["pot", "pan", "wok", "kadai", "tawa"]},
      {"label": "Storage", "keywords": ["box", "container", "jar", "rack", "organizer"]},
      {"label": "Cutlery", "keywords": ["spoon", "fork", "knife", "cutlery"]},
      {"label": "Bottle/Mug", "keywords": ["bottle", "mug", "flask", "cup", "glass"]},
      {"label": "Knife/Chopper", "keywords": ["chopper", "cutter", "grater", "peeler"]},
    ],
    "Home Appliance": [
      {"label": "Fan", "keywords": ["fan", "ceiling fan", "table fan"]},
      {"label": "Iron", "keywords": ["iron", "steam iron"]},
      {"label": "Blender/Mixer", "keywords": ["blender", "mixer", "juicer", "grinder"]},
      {"label": "Washing", "keywords": ["washing", "laundry"]},
      {"label": "Heater/Cooler", "keywords": ["heater", "cooler", "ac"]},
    ],
    "Health": [
      {"label": "Massager", "keywords": ["massager", "massage"]},
      {"label": "Scale/Monitor", "keywords": ["scale", "monitor", "bp", "pressure"]},
      {"label": "Fitness", "keywords": ["yoga", "exercise", "fitness", "gym", "resistance"]},
      {"label": "Thermometer", "keywords": ["thermometer", "temperature"]},
      {"label": "Pain Relief", "keywords": ["pain", "relief", "heat pad", "patch"]},
    ],
    "Toys": [
      {"label": "Toy Car/Vehicle", "keywords": ["car", "truck", "vehicle", "train", "bike"]},
      {"label": "Building Blocks", "keywords": ["block", "lego", "brick", "puzzle"]},
      {"label": "Doll/Action Figure", "keywords": ["doll", "barbie", "action figure", "robot"]},
      {"label": "Board Game", "keywords": ["board game", "chess", "carom", "game"]},
      {"label": "Educational Toy", "keywords": ["educational", "learning", "alphabet", "number"]},
    ],
    "Baby": [
      {"label": "Diaper/Wipes", "keywords": ["diaper", "wipes", "nappy"]},
      {"label": "Feeder/Nursing", "keywords": ["feeder", "bottle", "nursing", "sippy"]},
      {"label": "Baby Cream", "keywords": ["cream", "lotion", "powder", "oil"]},
      {"label": "Baby Carrier", "keywords": ["carrier", "sling", "pram", "stroller"]},
    ],
    "Big Offer": [
      {"label": "Flash Sale", "keywords": ["flash", "limited time"]},
      {"label": "Bundle Deal", "keywords": ["bundle", "combo", "pack"]},
      {"label": "Clearance", "keywords": ["clearance", "last piece"]},
    ],
  };

  /// Smart subcategory inference from product name when API doesn't provide one
  static String? _inferSubcategory(String name, String category) {
    if (name.isEmpty) return null;
    final n = name.toLowerCase();
    
    // Explicit keyword-based mappings matching the website classification logic
    if (category == "Women's Fashion") {
      if (n.contains('sharee') || n.contains('saree') || n.contains('shari')) return 'Sharee';
      if (n.contains('salwar') || n.contains('kameez') || n.contains('three piece') || n.contains('3 piece')) return 'Salwar';
      if (n.contains('kurti') || n.contains('tops') || n.contains('t-shirt') || n.contains('tshirt')) return 'Kurti';
      if (n.contains('borka') || n.contains('hijab') || n.contains('abaya')) return 'Borka';
      if (n.contains('bag') || n.contains('jewelry') || n.contains('necklace')) return "Women's Accessories";
      if (n.contains('cream') || n.contains('lotion') || n.contains('makeup') || n.contains('lipstick') || n.contains('face')) return 'Cosmetics';
    } else if (category == "Men's Fashion") {
      if (n.contains('panjabi') || n.contains('punjabi')) return 'Panjabi';
      if (n.contains('pajama') || n.contains('pyjama')) return 'Pajama';
      if (n.contains('t-shirt') || n.contains('tshirt') || n.contains('polo')) return 'T-Shirt';
      if (n.contains('shirt')) return 'Shirts';
      if (n.contains('pant') || n.contains('trouser') || n.contains('jeans') || n.contains('gabardine')) return 'Pants';
      if (n.contains('jersey')) return 'Jersey';
      if (n.contains('wallet') || n.contains('belt') || n.contains('sunglass')) return "Men's Accessories";
    } else if (category == "Gadgets & Electronics") {
      if (n.contains('cable') || n.contains('charger') || n.contains('cover') || n.contains('stand')) return 'Mobile Accessories';
      if (n.contains('mouse') || n.contains('keyboard') || n.contains('router') || n.contains('pendrive')) return 'Computer';
      if (n.contains('headphone') || n.contains('earphone') || n.contains('speaker') || n.contains('airpods') || n.contains('earbuds')) return 'Audio';
      if (n.contains('power bank')) return 'Power Bank';
      if (n.contains('trimmer') || n.contains('shaver') || n.contains('clipper')) return 'Trimmer';
    } else if (category == "Home & Lifestyle") {
      if (n.contains('bed sheet') || n.contains('bed cover') || n.contains('pillow')) return 'Bed Sheet';
      if (n.contains('blender') || n.contains('iron') || n.contains('fan') || n.contains('machine')) return 'Home Appliance';
      if (n.contains('bottle') || n.contains('mug') || n.contains('spoon') || n.contains('rack')) return 'Kitchen';
      if (n.contains('massager') || n.contains('scale') || n.contains('trimmer')) return 'Health';
    } else if (category == "Kids Zone") {
      if (n.contains('toy') || n.contains('car') || n.contains('puzzle')) return 'Toys';
      if (n.contains('diaper') || n.contains('feeder') || n.contains('baby')) return 'Baby';
      if (n.contains('dress') || n.contains('kid')) return 'Children';
    } else if (category == "Customize & Gift") {
      if (n.contains('mug') || n.contains('t-shirt') || n.contains('custom')) return 'Customize';
      return 'Gift';
    }

    // Generic fallback reverse-lookup from rules if the category matches
    final possibleSubs = _subcategoriesMap[category];
    if (possibleSubs != null) {
      for (final sub in possibleSubs) {
        // Direct match with subcategory name
        if (n.contains(sub.toLowerCase())) return sub;
        
        // Match with keywords inside subTypeRules
        final rules = _subTypeRules[sub];
        if (rules != null) {
          for (final rule in rules) {
            final keywords = rule['keywords'] as List<String>;
            for (final kw in keywords) {
              if (n.contains(kw)) {
                return sub;
              }
            }
          }
        }
      }
    }
    return null;
  }

  /// Generic 3rd-level subtype mapping based on name keywords
  static String? _inferSubType(String name, String subcategory) {
    if (name.isEmpty) return null;
    final n = name.toLowerCase();

    final rules = _subTypeRules[subcategory];
    if (rules != null) {
      for (final rule in rules) {
        final keywords = rule['keywords'] as List<String>;
        for (final kw in keywords) {
          if (n.contains(kw)) {
            return rule['label'] as String;
          }
        }
      }
    }
    return null;
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    // Robust image parsing to handle strings, maps, or lists
    List<String> productImages = [];

    dynamic rawImages = json['product_images'] ?? json['images'];
    if (rawImages is List) {
      for (var img in rawImages) {
        if (img is String) {
          String imgUrl = img;
          if (imgUrl.startsWith('//')) imgUrl = 'https:$imgUrl';
          if (imgUrl.startsWith('http')) productImages.add(imgUrl);
        } else if (img is Map && img.containsKey('product_image')) {
          String imgUrl = img['product_image'].toString();
          if (imgUrl.startsWith('//')) imgUrl = 'https:$imgUrl';
          if (imgUrl.startsWith('http')) productImages.add(imgUrl);
        } else if (img is Map && img.containsKey('url')) {
          String imgUrl = img['url'].toString();
          if (imgUrl.startsWith('//')) imgUrl = 'https:$imgUrl';
          if (imgUrl.startsWith('http')) productImages.add(imgUrl);
        } else if (img is Map && img.containsKey('src')) {
          String imgUrl = img['src'].toString();
          if (imgUrl.startsWith('//')) imgUrl = 'https:$imgUrl';
          if (imgUrl.startsWith('http')) productImages.add(imgUrl);
        }
      }
    }

    // Fallback for single image fields
    String? thumb = json['thumbnail_img']?.toString() ?? json['image']?.toString();
    if (thumb != null && thumb.startsWith('//')) thumb = 'https:$thumb';

    // Use first gallery image as thumbnail if available (more reliable, matching website logic)
    if (productImages.isNotEmpty) {
      thumb = productImages.first;
    } else if (thumb != null && thumb.startsWith('http')) {
      productImages.add(thumb);
    }

    final String productId = json['id']?.toString() ?? '';
    // Parse real selling price from API (sale_price contains the marked up price)
    final double sellingPrice = (json['sale_price'] as num?)?.toDouble() ?? (json['price'] as num?)?.toDouble() ?? 0.0;
    
    // Always generate a fake original price to guarantee a discount is shown, matching website logic
    final double originalPrice = _generateOriginalPrice(sellingPrice, productId);

    // Category normalization (matching website logic)
    // IMPORTANT: Check 'women' BEFORE 'men' — "women" contains "men"!
    String category = json['category']?.toString().trim().replaceAll(RegExp(r'\s+'), ' ') ?? 'Others';
    final catLower = category.toLowerCase();
    if (catLower.contains('woman') || catLower.contains('women') || catLower == "women's fashion") {
      category = "Women's Fashion";
    } else if (catLower == "men's fashion" || (catLower.contains('men') && !catLower.contains('women'))) {
      category = "Men's Fashion";
    } else if (catLower.contains('gedget') || catLower.contains('gadget') || catLower.contains('electronic')) {
      category = 'Gadgets & Electronics';
    } else if (catLower.contains('home') || catLower.contains('lifestyle') || catLower == 'lifestyle') {
      category = 'Home & Lifestyle';
    } else if (catLower.contains('kid')) {
      category = 'Kids Zone';
    } else if (catLower.contains('gift') || catLower.contains('custom')) {
      category = 'Customize & Gift';
    } else if (catLower.contains('offer')) {
      category = 'Offer';
    } else if (catLower.contains('watch')) {
      category = 'Watch';
    } else if (catLower.contains('food')) {
      category = 'Foods';
    } else if (catLower.contains('winter')) {
      category = 'Winter';
    }

    // Subcategory: prefer from API, fallback to inference
    String? subcategory = json['subcategory']?.toString().trim();
    
    // Normalize API subcategory to match canonical names (e.g. Saree -> Sharee)
    if (subcategory != null && subcategory.isNotEmpty) {
      final subLower = subcategory.toLowerCase();
      if (subLower == 'saree' || subLower == 'shari' || subLower == 'sari') {
        subcategory = 'Sharee';
      } else if (subLower == 'three piece') {
        subcategory = 'Salwar';
      } else if (subLower == 'kurti & salwar') {
        subcategory = 'Kurti';
      } else if (subLower == 'bedding') {
        subcategory = 'Bed Sheet';
      } else if (subLower == 'bags' || subLower == 'jewelry' || subLower == 'jewellery' || subLower == 'hijab & scarf') {
        subcategory = "Women's Accessories";
      } else if (subLower == 'charger & cable' || subLower == 'phone accessories') {
        subcategory = 'Mobile Accessories';
      } else if (subLower == 'computer accessories') {
        subcategory = 'Computer';
      } else if (subLower == 'lighting & fan') {
        subcategory = 'Home Appliance';
      } else if (subLower == 'toys & games') {
        subcategory = 'Toys';
      } else if (subLower == 'bottle & cup') {
        subcategory = 'Kitchen';
      }
    }

    if (subcategory == null || subcategory.isEmpty) {
      subcategory = _inferSubcategory(json['name']?.toString() ?? '', category);
    }
    
    // SubType inference
    final String? subType = _inferSubType(json['name']?.toString() ?? '', subcategory ?? '');

    // Trending detection (matching website logic)
    final seed = seedFromId(productId);
    final bool isTrending = json['is_trending'] == true || (seed % 15 == 0);

    return Product(
      id: productId,
      name: json['name']?.toString() ?? 'Unnamed Product',
      category: category,
      subcategory: subcategory,
      subType: subType,
      thumbnailImg: thumb,
      price: sellingPrice,
      originalPrice: originalPrice,
      details: json['details']?.toString() ?? json['desc']?.toString() ?? json['description']?.toString() ?? '',
      provider: json['provider']?.toString() ?? 'custom',
      isFeatured: json['is_featured'] == true,
      isTrending: isTrending,
      images: productImages,
      variants: json['product_variants'] is List ? json['product_variants'] : [],
    );
  }

  Product copyWith({
    String? id,
    String? name,
    String? category,
    String? subcategory,
    String? subType,
    String? thumbnailImg,
    double? price,
    double? originalPrice,
    String? details,
    String? provider,
    bool? isFeatured,
    bool? isTrending,
    List<String>? images,
    List<dynamic>? variants,
  }) {
    return Product(
      id: id ?? this.id,
      name: name ?? this.name,
      category: category ?? this.category,
      subcategory: subcategory ?? this.subcategory,
      subType: subType ?? this.subType,
      thumbnailImg: thumbnailImg ?? this.thumbnailImg,
      price: price ?? this.price,
      originalPrice: originalPrice ?? this.originalPrice,
      details: details ?? this.details,
      provider: provider ?? this.provider,
      isFeatured: isFeatured ?? this.isFeatured,
      isTrending: isTrending ?? this.isTrending,
      images: images ?? this.images,
      variants: variants ?? this.variants,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'category': category,
      'subcategory': subcategory,
      'subType': subType,
      'thumbnail_img': thumbnailImg,
      'price': price,
      'originalPrice': originalPrice,
      'details': details,
      'provider': provider,
      'is_featured': isFeatured,
      'is_trending': isTrending,
      'images': images,
      'product_variants': variants,
    };
  }
}

class SiteSettings {
  final double deliveryDhaka;
  final double deliveryOutside;
  final double freeThreshold;

  SiteSettings({
    required this.deliveryDhaka,
    required this.deliveryOutside,
    required this.freeThreshold,
  });

  factory SiteSettings.fromJson(Map<String, dynamic> json) {
    final ds = json['delivery_settings'] ?? {};
    return SiteSettings(
      deliveryDhaka: (ds['dhaka'] as num?)?.toDouble() ?? 60.0,
      deliveryOutside: (ds['outside'] as num?)?.toDouble() ?? 120.0,
      freeThreshold: (ds['free_threshold'] as num?)?.toDouble() ?? 10000.0,
    );
  }
}
