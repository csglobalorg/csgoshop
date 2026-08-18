import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/product_provider.dart';
import '../widgets/product_card.dart';
import 'checkout_screen.dart';

class ProductDetailsScreen extends ConsumerStatefulWidget {
  final Product product;
  const ProductDetailsScreen({super.key, required this.product});

  @override
  ConsumerState<ProductDetailsScreen> createState() => _ProductDetailsScreenState();
}

class _ProductDetailsScreenState extends ConsumerState<ProductDetailsScreen> {
  int _currentImage = 0;
  String? _selectedVariant;

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final hasImages = product.images.isNotEmpty;
    final images = hasImages
        ? product.images.map((url) => Product.getOptimizedImageUrl(url) ?? url).toList()
        : [Product.getOptimizedImageUrl(product.thumbnailImg) ?? ''];
    final discountPercent = product.discountPercent;

    // Get all products for related/recommendations
    final allProducts = ref.watch(productProvider).products;

    // Related products: same category, up to 8
    final relatedProducts = allProducts
        .where((p) => p.category == product.category && p.id != product.id)
        .take(8)
        .toList();

    // "You May Also Like": trending from other categories, up to 8
    List<Product> youMayLike = allProducts
        .where((p) {
          if (p.id == product.id) return false;
          if (p.category == product.category) return false;
          if (product.subcategory != null && p.subcategory == product.subcategory) return true;
          if (p.isTrending) return true;
          return false;
        })
        .take(8)
        .toList();

    // Fill with extras if too few
    if (youMayLike.length < 4) {
      final extras = allProducts
          .where((p) =>
              p.id != product.id &&
              p.category != product.category &&
              !youMayLike.any((y) => y.id == p.id))
          .take(8 - youMayLike.length)
          .toList();
      youMayLike.addAll(extras);
    }

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      body: CustomScrollView(
        slivers: [
          // Image Carousel
          SliverAppBar(
            expandedHeight: 400,
            pinned: true,
            backgroundColor: AppConstants.backgroundColor,
            leading: Padding(
              padding: const EdgeInsets.all(8.0),
              child: CircleAvatar(
                backgroundColor: Colors.black.withOpacity(0.5),
                child: IconButton(
                  icon: const Icon(Icons.arrow_back, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                children: [
                  CarouselSlider(
                    options: CarouselOptions(
                      height: 450,
                      viewportFraction: 1.0,
                      onPageChanged: (index, reason) {
                        setState(() => _currentImage = index);
                      },
                    ),
                    items: images.map((url) {
                      return CachedNetworkImage(
                        imageUrl: url,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorWidget: (context, url, error) => const Icon(Icons.broken_image),
                      );
                    }).toList(),
                  ),
                  if (images.length > 1)
                    Positioned(
                      bottom: 20,
                      left: 0,
                      right: 0,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: images.asMap().entries.map((entry) {
                          return Container(
                            width: 8.0,
                            height: 8.0,
                            margin: const EdgeInsets.symmetric(horizontal: 4.0),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Colors.white.withOpacity(
                                _currentImage == entry.key ? 0.9 : 0.4,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Product Info
          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Category + Cashback Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      product.category.toUpperCase(),
                      style: const TextStyle(
                        color: AppConstants.accentColor,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                    // Cashback badge (matching website)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00C853).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF00C853).withOpacity(0.3)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.bolt, color: Color(0xFF00C853), size: 14),
                          SizedBox(width: 4),
                          Text(
                            '৳200 Cashback',
                            style: TextStyle(
                              color: Color(0xFF00C853),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Product Name
                Text(
                  product.name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    height: 1.3,
                  ),
                ),
                const SizedBox(height: 16),

                // Price Row with discount
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      '৳${product.price.toInt()}',
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        color: AppConstants.accentColor,
                      ),
                    ),
                    if (product.originalPrice > product.price) ...[
                      const SizedBox(width: 12),
                      Text(
                        '৳${product.originalPrice.toInt()}',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.35),
                          decoration: TextDecoration.lineThrough,
                          decorationColor: Colors.white.withOpacity(0.35),
                        ),
                      ),
                      const SizedBox(width: 10),
                      if (discountPercent > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF00C853).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            '-$discountPercent% OFF',
                            style: const TextStyle(
                              color: Color(0xFF00C853),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                    ],
                  ],
                ),
                const SizedBox(height: 20),

                // Special Offer Banner (matching website)
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF00C853).withOpacity(0.08),
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: const Color(0xFF00C853).withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 36,
                        height: 36,
                        decoration: const BoxDecoration(
                          color: Color(0xFF00C853),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.card_giftcard, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Special Offer!',
                              style: TextStyle(color: Color(0xFF00C853), fontWeight: FontWeight.w700, fontSize: 13),
                            ),
                            Text(
                              'Buy this item & get up to ৳200 Cashback',
                              style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Variants
                if (product.variants.isNotEmpty) ...[
                  const Text(
                    'Available Variants',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 10,
                    children: product.variants.map((v) {
                      final name = v is Map ? (v['name'] ?? v['title'] ?? v['variant'] ?? 'Option').toString() : v.toString();
                      final isSelected = _selectedVariant == name;
                      return ChoiceChip(
                        label: Text(name),
                        selected: isSelected,
                        onSelected: (val) => setState(() => _selectedVariant = name),
                        selectedColor: AppConstants.accentColor,
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.black : Colors.white,
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                ],

                // Description
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.06)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.description_outlined, color: AppConstants.accentColor, size: 18),
                          const SizedBox(width: 8),
                          const Text(
                            'Product Description',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppConstants.accentColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(
                        product.details ?? 'No description available.',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withOpacity(0.65),
                          height: 1.7,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Delivery Info (matching website)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppConstants.surfaceColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.06)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.local_shipping_outlined, color: AppConstants.accentColor, size: 18),
                          const SizedBox(width: 8),
                          const Text(
                            'Delivery Information',
                            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppConstants.accentColor),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _deliveryRow('Inside Dhaka', '1-2 days', '60 TK'),
                      const Divider(color: Colors.white10, height: 20),
                      _deliveryRow('Dhaka Sub Area', '1-2 days', '100 TK'),
                      const Divider(color: Colors.white10, height: 20),
                      _deliveryRow('Outside Dhaka', '2-4 days', '120 TK'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Trust badges
                Row(
                  children: [
                    Expanded(child: _trustBadge(Icons.shield_outlined, 'Secure Payment')),
                    const SizedBox(width: 10),
                    Expanded(child: _trustBadge(Icons.local_shipping_outlined, 'Fast Delivery')),
                  ],
                ),

                const SizedBox(height: 80), // Space for bottom button
              ]),
            ),
          ),

          // ═══════════════════════════════════════════
          // Related Products Section
          // ═══════════════════════════════════════════
          if (relatedProducts.isNotEmpty) ...[
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 8),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Container(width: 4, height: 22, decoration: BoxDecoration(color: AppConstants.accentColor, borderRadius: BorderRadius.circular(2))),
                    const SizedBox(width: 12),
                    const Icon(Icons.grid_view_rounded, color: AppConstants.accentColor, size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      'Related Products',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.65,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) => ProductCard(product: relatedProducts[index]),
                  childCount: relatedProducts.length,
                ),
              ),
            ),
          ],

          // ═══════════════════════════════════════════
          // You May Also Like Section
          // ═══════════════════════════════════════════
          if (youMayLike.isNotEmpty) ...[
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 30, 20, 8),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Container(
                      width: 4, height: 22,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(colors: [AppConstants.accentColor, Color(0xFFEF4444)]),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.favorite, color: Color(0xFFEF4444), size: 18),
                    const SizedBox(width: 8),
                    const Text(
                      'You May Also Like',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 30),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  childAspectRatio: 0.65,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) => ProductCard(product: youMayLike[index]),
                  childCount: youMayLike.length,
                ),
              ),
            ),
          ],
        ],
      ),
      bottomSheet: _bottomBar(),
    );
  }

  Widget _deliveryRow(String location, String time, String charge) {
    return Row(
      children: [
        Expanded(flex: 3, child: Text(location, style: const TextStyle(color: Colors.white70, fontSize: 13))),
        Expanded(flex: 2, child: Text(time, style: const TextStyle(color: Colors.white54, fontSize: 13))),
        Text(charge, style: const TextStyle(color: AppConstants.accentColor, fontWeight: FontWeight.bold, fontSize: 13)),
      ],
    );
  }

  Widget _trustBadge(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
      decoration: BoxDecoration(
        color: AppConstants.accentColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppConstants.accentColor.withOpacity(0.1)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: AppConstants.accentColor, size: 16),
          const SizedBox(width: 8),
          Flexible(child: Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12))),
        ],
      ),
    );
  }

  Widget _bottomBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppConstants.surfaceColor,
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Add to Cart Button (Secondary)
            Expanded(
              flex: 1,
              child: OutlinedButton.icon(
                onPressed: () {
                  ref.read(cartProvider.notifier).addToCart(
                    widget.product, 
                    variants: _selectedVariant != null ? {'Option': _selectedVariant} : null
                  );
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Added to cart')),
                  );
                },
                icon: const Icon(Icons.add_shopping_cart, size: 20),
                label: const Text('Cart'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppConstants.accentColor,
                  side: const BorderSide(color: AppConstants.accentColor),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            // Buy Now Button (Primary)
            Expanded(
              flex: 2,
              child: ElevatedButton(
                onPressed: () {
                  ref.read(cartProvider.notifier).addToCart(
                    widget.product, 
                    variants: _selectedVariant != null ? {'Option': _selectedVariant} : null
                  );
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const CheckoutScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppConstants.accentColor,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 0,
                ),
                child: const Text('BUY NOW', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 1)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
