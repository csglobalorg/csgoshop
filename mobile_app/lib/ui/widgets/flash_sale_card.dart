import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../data/models/product.dart';
import '../screens/product_details_screen.dart';

class FlashSaleCard extends StatelessWidget {
  final Product product;
  const FlashSaleCard({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    final discountPercent = product.discountPercent;
    final soldPercent = 40 + (Product.seedFromId(product.id) % 55);

    return GestureDetector(
      onTap: () => Navigator.push(context,
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 400),
          pageBuilder: (_, __, ___) => ProductDetailsScreen(product: product),
          transitionsBuilder: (_, a, __, child) => FadeTransition(opacity: a, child: child),
        ),
      ),
      child: Container(
        width: 145,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [
            AppConstants.surfaceColor.withOpacity(0.95),
            const Color(0xFF0D1525),
          ]),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.06)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6), spreadRadius: -4),
            BoxShadow(color: const Color(0xFFEF4444).withOpacity(0.04), blurRadius: 20),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: SizedBox(
                width: double.infinity,
                child: Stack(fit: StackFit.expand, children: [
                CachedNetworkImage(
                  imageUrl: Product.getOptimizedImageUrl(product.thumbnailImg) ?? '',
                  fit: BoxFit.cover,
                  placeholder: (_, __) => Container(color: Colors.white.withOpacity(0.03),
                    child: const Center(child: SizedBox(width: 20, height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2, color: AppConstants.accentColor),
                    )),
                  ),
                  errorWidget: (_, __, ___) => Container(color: Colors.white.withOpacity(0.03),
                    child: const Icon(Icons.image_not_supported, color: Colors.white10, size: 28),
                  ),
                ),
                // Bottom gradient blend
                Positioned(bottom: 0, left: 0, right: 0, child: Container(height: 40,
                  decoration: BoxDecoration(gradient: LinearGradient(
                    begin: Alignment.bottomCenter, end: Alignment.topCenter,
                    colors: [AppConstants.surfaceColor, Colors.transparent],
                  )),
                )),
                if (discountPercent > 0)
                  Positioned(top: 6, left: 6, child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFFFF3B30), Color(0xFFEF4444)]),
                      borderRadius: BorderRadius.circular(6),
                      boxShadow: [BoxShadow(color: const Color(0xFFEF4444).withOpacity(0.5), blurRadius: 10)],
                    ),
                    child: Text('-$discountPercent%', style: const TextStyle(
                      color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900,
                    )),
                  )),
              ]),
            ),
          ),
          Padding(
              padding: const EdgeInsets.all(10),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text('\u09f3${product.price.toInt()}', style: TextStyle(
                    color: AppConstants.accentColor, fontSize: 15, fontWeight: FontWeight.w900,
                    shadows: [Shadow(color: AppConstants.accentColor.withOpacity(0.3), blurRadius: 6)],
                  )),
                  if (product.originalPrice > product.price) ...[
                    const SizedBox(width: 4),
                    Text('\u09f3${product.originalPrice.toInt()}', style: TextStyle(
                      color: Colors.white.withOpacity(0.25), fontSize: 10,
                      decoration: TextDecoration.lineThrough, decorationColor: Colors.white.withOpacity(0.25),
                    )),
                  ],
                ]),
                const SizedBox(height: 5),
                Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(
                  color: Colors.white.withOpacity(0.75), fontSize: 11, fontWeight: FontWeight.w500,
                )),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Stack(children: [
                    Container(height: 6, width: double.infinity, color: Colors.white.withOpacity(0.06)),
                    FractionallySizedBox(
                      widthFactor: soldPercent / 100,
                      child: Container(height: 6, decoration: BoxDecoration(
                        gradient: LinearGradient(colors: soldPercent > 75
                            ? [const Color(0xFFFF3B30), const Color(0xFFEF4444)]
                            : [AppConstants.accentColor, const Color(0xFFFF8C00)]),
                        borderRadius: BorderRadius.circular(4),
                        boxShadow: [BoxShadow(
                          color: (soldPercent > 75 ? const Color(0xFFEF4444) : AppConstants.accentColor).withOpacity(0.4),
                          blurRadius: 6,
                        )],
                      )),
                    ),
                  ]),
                ),
                const SizedBox(height: 4),
                Text('$soldPercent% Sold', style: TextStyle(
                  color: soldPercent > 75 ? const Color(0xFFEF4444) : Colors.white.withOpacity(0.35),
                  fontSize: 9, fontWeight: FontWeight.w700,
                )),
              ]),
            ),
          ],
        ),
      ),
    );
  }
}
