import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/product.dart';
import '../../providers/cart_provider.dart';
import '../../providers/wishlist_provider.dart';
import '../screens/product_details_screen.dart';
import '../../core/constants.dart';

// ─────────────────────────────────────────────────────────────────────────────
// ProductCard — Daraz/AliExpress style grid card
// ─────────────────────────────────────────────────────────────────────────────
class ProductCard extends ConsumerStatefulWidget {
  final Product product;
  const ProductCard({super.key, required this.product});

  @override
  ConsumerState<ProductCard> createState() => _ProductCardState();
}

class _ProductCardState extends ConsumerState<ProductCard> {
  bool _pressed = false;

  void _navigate() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ProductDetailsScreen(product: widget.product)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final isWishlisted = ref.watch(wishlistProvider.select((list) => list.any((p) => p.id == product.id)));
    final discount = product.discountPercent.toInt();
    final seed = Product.seedFromId(product.id);
    final rating = 4.0 + (seed % 10) / 10;
    final reviewCount = (seed % 180) + 20;

    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: _navigate,
      child: AnimatedScale(
        scale: _pressed ? 0.96 : 1.0,
        duration: const Duration(milliseconds: 120),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A1F),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.06)),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Image ──────────────────────────────────────────────────
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    // Product image
                    SizedBox(
                      width: double.infinity,
                      child: CachedNetworkImage(
                        imageUrl: Product.getOptimizedImageUrl(product.thumbnailImg) ?? '',
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(
                          color: const Color(0xFF0F0F13),
                          child: const Center(
                            child: SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppConstants.accentColor,
                              ),
                            ),
                          ),
                        ),
                        errorWidget: (_, __, ___) => Container(
                          color: const Color(0xFF1E293B),
                          child: const Center(
                            child: Icon(Icons.image_not_supported_outlined,
                                color: Colors.white12, size: 32),
                          ),
                        ),
                      ),
                    ),

                    // Discount badge
                    if (discount > 0)
                      Positioned(
                        top: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEF4444),
                            borderRadius: BorderRadius.circular(5),
                          ),
                          child: Text(
                            '-$discount%',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),

                    // Wishlist button
                    Positioned(
                      top: 6,
                      right: 6,
                      child: GestureDetector(
                        onTap: () {
                          ref.read(wishlistProvider.notifier).toggleWishlist(product);
                        },
                        child: Container(
                          width: 30, height: 30,
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.45),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            isWishlisted ? Icons.favorite : Icons.favorite_border,
                            color: isWishlisted ? const Color(0xFFEF4444) : Colors.white,
                            size: 16,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Info ───────────────────────────────────────────────────
              Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                      // Product name
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 4),

                      // Rating row
                      Row(
                        children: [
                          const Icon(Icons.star_rounded, color: Color(0xFFFBBF24), size: 12),
                          const SizedBox(width: 2),
                          Text(
                            rating.toStringAsFixed(1),
                            style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 10, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '($reviewCount)',
                            style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 10),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Price row
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '৳${product.price.toInt()}',
                            style: const TextStyle(
                              color: AppConstants.accentColor,
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          if (product.originalPrice > product.price) ...[
                            const SizedBox(width: 4),
                            Text(
                              '৳${product.originalPrice.toInt()}',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.3),
                                fontSize: 10,
                                decoration: TextDecoration.lineThrough,
                                decorationColor: Colors.white.withOpacity(0.3),
                              ),
                            ),
                          ],
                          const Spacer(),
                          // Quick add to cart
                          GestureDetector(
                            onTap: () {
                            ref.read(cartProvider.notifier).addToCart(product);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Added to cart', style: const TextStyle(fontSize: 12)),
                                  duration: const Duration(milliseconds: 800),
                                  behavior: SnackBarBehavior.floating,
                                  backgroundColor: const Color(0xFF18181B),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                              );
                            },
                            child: Container(
                              width: 26, height: 26,
                              decoration: BoxDecoration(
                                color: AppConstants.accentColor,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: const Icon(Icons.add, color: Colors.black, size: 16),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
