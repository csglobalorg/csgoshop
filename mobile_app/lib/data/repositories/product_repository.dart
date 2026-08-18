import '../models/product.dart';
import '../services/supabase_service.dart';

class ProductRepository {
  final SupabaseService _service;

  ProductRepository(this._service);

  Future<List<Product>> getProducts() async {
    final data = await _service.fetchProducts();
    return data.map((json) => Product.fromJson(json)).toList();
  }
}
