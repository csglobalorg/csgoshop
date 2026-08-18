import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../data/models/product.dart';
import 'auth_provider.dart';

class WishlistNotifier extends StateNotifier<List<Product>> {
  final Ref ref;
  WishlistNotifier(this.ref) : super([]) {
    _loadWishlist();
  }

  Future<void> _loadWishlist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final data = prefs.getString('wishlist_items');
      if (data != null) {
        final List<dynamic> jsonList = json.decode(data);
        state = jsonList.map((e) => Product.fromJson(e)).toList();
      }
      _syncFromCloud();
    } catch (e) {
      print('Failed to load wishlist: $e');
    }
  }

  Future<void> _syncFromCloud() async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) return;

    try {
      final response = await http.post(
        Uri.parse('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/supabase-user-data'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'action': 'get_wishlist',
          'auth': {'phone': authState.profile!['phone']}
        }),
      );

      if (response.statusCode == 200) {
        final resData = json.decode(response.body);
        if (resData['success'] == true) {
          // Sync logic placeholder
        }
      }
    } catch (e) {
      print('Cloud wishlist sync error: $e');
    }
  }

  Future<void> _saveWishlist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = state.map((p) => p.toJson()).toList();
      await prefs.setString('wishlist_items', json.encode(jsonList));
    } catch (e) {
      print('Failed to save wishlist: $e');
    }
  }

  Future<void> toggleWishlist(Product product) async {
    final isFav = isInWishlist(product.id);
    if (isFav) {
      state = state.where((p) => p.id != product.id).toList();
    } else {
      state = [...state, product];
    }
    _saveWishlist();

    // Sync to cloud
    final authState = ref.read(authProvider);
    if (authState.isAuthenticated) {
      try {
        await http.post(
          Uri.parse('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/supabase-user-data'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'action': isFav ? 'remove_from_wishlist' : 'add_to_wishlist',
            'auth': {'phone': authState.profile!['phone']},
            'data': {'product_id': product.id}
          }),
        );
      } catch (e) {
        print('Failed to sync toggle to cloud: $e');
      }
    }
  }

  bool isInWishlist(String productId) {
    return state.any((p) => p.id == productId);
  }
}

final wishlistProvider = StateNotifierProvider<WishlistNotifier, List<Product>>((ref) {
  return WishlistNotifier(ref);
});
