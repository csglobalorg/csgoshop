import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/wishlist_provider.dart';
import '../widgets/product_card.dart';

class WishlistScreen extends ConsumerWidget {
  const WishlistScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wishlistItems = ref.watch(wishlistProvider);

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('My Wishlist', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: wishlistItems.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.favorite_border, size: 80, color: Colors.white.withOpacity(0.2)),
                  const SizedBox(height: 16),
                  const Text('Your wishlist is empty', style: TextStyle(color: Colors.white54, fontSize: 18)),
                  const SizedBox(height: 8),
                  const Text('Save items you love here', style: TextStyle(color: Colors.white30, fontSize: 14)),
                ],
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.65, // Same as Home screen
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: wishlistItems.length,
              itemBuilder: (context, index) {
                return ProductCard(product: wishlistItems[index]);
              },
            ),
    );
  }
}
