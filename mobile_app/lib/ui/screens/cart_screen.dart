import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/cart_provider.dart';
import '../../data/models/product.dart';
import 'checkout_screen.dart';

class CartScreen extends ConsumerWidget {
  final bool showAppBar;
  const CartScreen({super.key, this.showAppBar = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartItems = ref.watch(cartProvider);
    final subtotal = ref.read(cartProvider.notifier).subtotal;

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: showAppBar ? AppBar(
        backgroundColor: AppConstants.surfaceColor,
        elevation: 0,
        centerTitle: true,
        title: const Text('My Cart', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18, letterSpacing: 0.5)),
        iconTheme: const IconThemeData(color: Colors.white),
      ) : null,
      body: cartItems.isEmpty ? _buildEmptyState() : _buildCartList(context, ref, cartItems, subtotal),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppConstants.surfaceColor,
              shape: BoxShape.circle,
              border: Border.all(color: Colors.white.withOpacity(0.05), width: 2),
            ),
            child: const Icon(LucideIcons.shoppingBag, size: 64, color: Colors.white24),
          ),
          const SizedBox(height: 24),
          const Text(
            'Your cart is empty',
            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Looks like you haven\'t added\nanything to your cart yet.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.white54, fontSize: 14, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _buildCartList(BuildContext context, WidgetRef ref, List<CartItem> cartItems, double subtotal) {
    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
            itemCount: cartItems.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final item = cartItems[index];
              return Dismissible(
                key: Key(item.product.id),
                direction: DismissDirection.endToStart,
                onDismissed: (_) {
                  ref.read(cartProvider.notifier).removeFromCart(item.product.id);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('Item removed from cart', style: TextStyle(color: Colors.white)),
                      backgroundColor: AppConstants.surfaceColor,
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  );
                },
                background: Container(
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444).withOpacity(0.2),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(LucideIcons.trash2, color: Color(0xFFEF4444)),
                ),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppConstants.surfaceColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      // Product Image
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          Product.getOptimizedImageUrl(item.product.thumbnailImg) ?? '',
                          width: 85,
                          height: 85,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            width: 85, height: 85,
                            color: const Color(0xFF1E293B),
                            child: const Icon(Icons.image_not_supported, color: Colors.white24, size: 28),
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      // Product Details
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.product.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, height: 1.3),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '৳${item.product.price.toInt()}',
                                  style: const TextStyle(color: AppConstants.accentColor, fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                // Quantity Controls
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.03),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                                  ),
                                  child: Row(
                                    children: [
                                      _QtyBtn(
                                        icon: Icons.remove,
                                        onTap: () => ref.read(cartProvider.notifier).updateQuantity(item.product.id, -1),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        child: Text(
                                          '${item.quantity}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                        ),
                                      ),
                                      _QtyBtn(
                                        icon: Icons.add,
                                        onTap: () => ref.read(cartProvider.notifier).updateQuantity(item.product.id, 1),
                                      ),
                                    ],
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
              );
            },
          ),
        ),
        
        // Checkout Summary
        Container(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 30),
          decoration: BoxDecoration(
            color: AppConstants.surfaceColor,
            borderRadius: const BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.3),
                blurRadius: 20,
                offset: const Offset(0, -5),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Subtotal', style: TextStyle(color: Colors.white70, fontSize: 15)),
                    Text('৳${subtotal.toInt()}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Delivery', style: TextStyle(color: Colors.white70, fontSize: 15)),
                    Text('Calculated at next step', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 13, fontStyle: FontStyle.italic)),
                  ],
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 16),
                  child: Divider(color: Colors.white10, height: 1),
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    Text('৳${subtotal.toInt()}', style: const TextStyle(color: AppConstants.accentColor, fontSize: 22, fontWeight: FontWeight.w900)),
                  ],
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const CheckoutScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppConstants.accentColor,
                    foregroundColor: Colors.black,
                    minimumSize: const Size(double.infinity, 56),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 4,
                    shadowColor: AppConstants.accentColor.withOpacity(0.4),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Text('PROCEED TO CHECKOUT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 0.5)),
                      SizedBox(width: 8),
                      Icon(LucideIcons.arrowRight, size: 18),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _QtyBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _QtyBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Icon(icon, size: 16, color: Colors.white),
      ),
    );
  }
}
