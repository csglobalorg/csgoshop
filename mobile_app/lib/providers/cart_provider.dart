import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/models/product.dart';

class CartItem {
  final Product product;
  int quantity;
  final Map<String, dynamic>? selectedVariants;

  CartItem({required this.product, this.quantity = 1, this.selectedVariants});
}

class CartNotifier extends StateNotifier<List<CartItem>> {
  CartNotifier() : super([]);

  void addToCart(Product product, {Map<String, dynamic>? variants}) {
    final index = state.indexWhere((item) => 
      item.product.id == product.id && 
      (item.selectedVariants?.toString() == variants?.toString())
    );
    if (index != -1) {
      state = [
        for (int i = 0; i < state.length; i++)
          if (i == index)
            CartItem(product: state[i].product, quantity: state[i].quantity + 1, selectedVariants: state[i].selectedVariants)
          else
            state[i]
      ];
    } else {
      state = [...state, CartItem(product: product, selectedVariants: variants)];
    }
  }

  void removeFromCart(String productId) {
    state = state.where((item) => item.product.id != productId).toList();
  }

  void updateQuantity(String productId, int delta, {Map<String, dynamic>? variants}) {
    state = [
      for (final item in state)
        if (item.product.id == productId && (item.selectedVariants?.toString() == variants?.toString()))
          CartItem(product: item.product, quantity: (item.quantity + delta).clamp(1, 99), selectedVariants: item.selectedVariants)
        else
          item
    ];
  }

  void clearCart() {
    state = [];
  }

  // Uses product.price (selling price) — NOT the old salePrice which was admin cost
  double get subtotal => state.fold(0, (sum, item) => sum + (item.product.price * item.quantity));
}

final cartProvider = StateNotifierProvider<CartNotifier, List<CartItem>>((ref) {
  return CartNotifier();
});
