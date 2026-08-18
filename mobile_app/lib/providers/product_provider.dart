import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import '../data/models/product.dart';

class ProductState {
  final List<Product> products;
  final SiteSettings? settings;
  final bool isLoading;
  final String? error;

  ProductState({
    this.products = const [],
    this.settings,
    this.isLoading = false,
    this.error,
  });

  ProductState copyWith({
    List<Product>? products,
    SiteSettings? settings,
    bool? isLoading,
    String? error,
  }) {
    return ProductState(
      products: products ?? this.products,
      settings: settings ?? this.settings,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class ProductNotifier extends StateNotifier<ProductState> {
  ProductNotifier() : super(ProductState()) {
    _init();
  }

  Future<void> _init() async {
    await _loadCache();
    fetchData();
  }

  Future<void> _loadCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      String? cachedData = prefs.getString('products_cache_v2');
      
      if (cachedData == null) {
        cachedData = await rootBundle.loadString('assets/data/products.json');
      }

      if (cachedData.isNotEmpty) {
        final Map<String, dynamic> data = await compute(_parseJsonData, cachedData);
        final List<dynamic> productsJson = data['products'] ?? [];
        final settingsJson = data['settings'] ?? {};
        
        List<Product> products = [];
        for (var p in productsJson) {
          if (p is Map<String, dynamic>) {
            try {
              products.add(Product.fromJson(p));
            } catch (e) {
              print('Cache product parse error: $e');
            }
          }
        }

        state = state.copyWith(
          products: products,
          settings: SiteSettings.fromJson(settingsJson),
          isLoading: false,
        );
      }
    } catch (e) {
      print('Cache load failed: $e');
    }
  }

  static Map<String, dynamic> _parseJsonData(String data) {
    return json.decode(data) as Map<String, dynamic>;
  }

  Future<void> fetchData() async {
    final showLoading = state.products.isEmpty;
    if (showLoading) state = state.copyWith(isLoading: true, error: null);
    
    try {
      final url = Uri.parse('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/get-products');
      
      final response = await http.get(url).timeout(
        const Duration(seconds: 30),
        onTimeout: () => throw Exception('Connection timed out. Please try again.'),
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        final productsList = data['products'];
        final settingsMap = data['settings'];
        
        List<Product> fetchedProducts = [];
        SiteSettings? settings;
        
        if (productsList is List) {
          for (var p in productsList) {
            if (p is Map<String, dynamic>) {
              try {
                fetchedProducts.add(Product.fromJson(p));
              } catch (e) {
                print('Error parsing product ${p["id"]}: $e');
              }
            }
          }
        }
        
        if (settingsMap is Map<String, dynamic>) {
          settings = SiteSettings.fromJson(settingsMap);
        }
        
        // Deduplicate locally just in case (using robust ID deduplication instead of name+price which hides variants)
        Map<String, Product> uniqueProducts = {};
        for (var p in fetchedProducts) {
          if (!uniqueProducts.containsKey(p.id)) {
            uniqueProducts[p.id] = p;
          }
        }
        
        state = state.copyWith(
          products: uniqueProducts.values.toList(),
          settings: settings ?? state.settings,
          isLoading: false,
        );
        
        try {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('products_cache_v2', response.body);
        } catch (e) {
          print('Cache save failed: $e');
        }
      } else {
        throw Exception('Server returned ${response.statusCode}');
      }
    } catch (e) {
      print('API fetch failed: $e');
      if (state.products.isEmpty) {
        state = state.copyWith(
          isLoading: false,
          error: 'Failed to load products: $e',
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    }
  }

  void filterByCategory(String category) {
    // Logic for filtering can be done here or in the UI
  }
}

final productProvider = StateNotifierProvider<ProductNotifier, ProductState>((ref) {
  return ProductNotifier();
});

final categoryProvider = Provider<List<String>>((ref) {
  final products = ref.watch(productProvider).products;
  final categories = products.map((p) => p.category).toSet().toList();
  return ['All', ...categories];
});
