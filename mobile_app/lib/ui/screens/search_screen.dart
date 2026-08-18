import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../core/constants.dart';
import '../../providers/product_provider.dart';
import '../../data/models/product.dart';
import '../widgets/product_card.dart';

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _searchCtrl = TextEditingController();
  final List<String> _recentSearches = ['T-Shirt', 'Smart Watch', 'Panjabi', 'Sneakers', 'Headphones'];
  final List<String> _trendingTags = ['⚡ Flash Sale', '👗 Women\'s Fashion', '👔 Men\'s Fashion', '📱 Gadgets', '🔥 Best Sellers'];
  
  String _query = '';
  String _selectedCategory = 'All';
  double _maxPrice = 10000;
  String _sortBy = 'relevance';

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearch(String term) {
    setState(() {
      _query = term;
      _searchCtrl.text = term;
      if (term.isNotEmpty && !_recentSearches.contains(term)) {
        _recentSearches.insert(0, term);
        if (_recentSearches.length > 8) _recentSearches.removeLast();
      }
    });
  }

  void _openFilterDrawer() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Container(
            decoration: const BoxDecoration(
              color: AppConstants.cardColor,
              borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
            ),
            padding: EdgeInsets.only(
              left: 20, right: 20, top: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Filter & Sort', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close, color: Colors.white54),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Category Selector
                const Text('Category', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: ['All', "Men's Fashion", "Women's Fashion", 'Gadgets & Electronics', 'Home & Lifestyle'].map((cat) {
                    final isSel = _selectedCategory == cat;
                    return ChoiceChip(
                      label: Text(cat),
                      selected: isSel,
                      onSelected: (selected) {
                        setModalState(() => _selectedCategory = cat);
                        setState(() => _selectedCategory = cat);
                      },
                      selectedColor: AppConstants.accentColor,
                      backgroundColor: AppConstants.backgroundColor,
                      labelStyle: TextStyle(color: isSel ? Colors.black : Colors.white70, fontWeight: isSel ? FontWeight.bold : FontWeight.normal),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),

                // Sort By Selector
                const Text('Sort By', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _sortBy,
                  dropdownColor: AppConstants.cardColor,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    fillColor: AppConstants.backgroundColor,
                    filled: true,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'relevance', child: Text('Relevance')),
                    DropdownMenuItem(value: 'price_low', child: Text('Price: Low to High')),
                    DropdownMenuItem(value: 'price_high', child: Text('Price: High to Low')),
                    DropdownMenuItem(value: 'newest', child: Text('Newest Arrivals')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setModalState(() => _sortBy = val);
                      setState(() => _sortBy = val);
                    }
                  },
                ),
                const SizedBox(height: 24),

                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppConstants.accentColor,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Apply Filters', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productState = ref.watch(productProvider);
    final allProducts = productState.products;

    // Filter Logic
    List<Product> results = allProducts.where((p) {
      final matchesQuery = _query.isEmpty ||
          p.name.toLowerCase().contains(_query.toLowerCase()) ||
          p.category.toLowerCase().contains(_query.toLowerCase()) ||
          (p.details ?? '').toLowerCase().contains(_query.toLowerCase());

      final matchesCategory = _selectedCategory == 'All' || p.category.toLowerCase().contains(_selectedCategory.toLowerCase());
      final matchesPrice = p.price <= _maxPrice;

      return matchesQuery && matchesCategory && matchesPrice;
    }).toList();

    // Sorting
    if (_sortBy == 'price_low') {
      results.sort((a, b) => a.price.compareTo(b.price));
    } else if (_sortBy == 'price_high') {
      results.sort((a, b) => b.price.compareTo(a.price));
    } else if (_sortBy == 'newest') {
      results = results.reversed.toList();
    }

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF09090B),
        elevation: 0,
        title: TextField(
          controller: _searchCtrl,
          autofocus: false,
          style: const TextStyle(color: Colors.white, fontSize: 15),
          onChanged: (v) => setState(() => _query = v),
          onSubmitted: _onSearch,
          decoration: InputDecoration(
            hintText: 'Search products, brands, categories...',
            hintStyle: TextStyle(color: Colors.white.withOpacity(0.35)),
            prefixIcon: const Icon(LucideIcons.search, color: AppConstants.accentColor, size: 20),
            suffixIcon: _query.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.clear, color: Colors.white54, size: 18),
                    onPressed: () {
                      _searchCtrl.clear();
                      setState(() => _query = '');
                    },
                  )
                : null,
            filled: true,
            fillColor: const Color(0xFF18181B),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.08)),
            ),
          ),
        ),
        actions: [
          IconButton(
            onPressed: _openFilterDrawer,
            icon: const Icon(LucideIcons.sliders, color: Colors.white70),
          ),
        ],
      ),
      body: _query.isEmpty ? _buildDiscoveryView() : _buildSearchResults(results),
    );
  }

  Widget _buildDiscoveryView() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Trending Searches
          const Text('🔥 Trending Searches', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _trendingTags.map((tag) {
              return GestureDetector(
                onTap: () => _onSearch(tag.replaceAll(RegExp(r'[^\w\s]'), '').trim()),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF18181B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Text(tag, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500)),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),

          // Recent Searches
          if (_recentSearches.isNotEmpty) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('🕒 Recent Searches', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                TextButton(
                  onPressed: () => setState(() => _recentSearches.clear()),
                  child: const Text('Clear All', style: TextStyle(color: Colors.white38, fontSize: 12)),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _recentSearches.map((term) {
                return InputChip(
                  label: Text(term),
                  labelStyle: const TextStyle(color: Colors.white70, fontSize: 12),
                  backgroundColor: const Color(0xFF18181B),
                  deleteIcon: const Icon(Icons.close, size: 14, color: Colors.white38),
                  onDeleted: () => setState(() => _recentSearches.remove(term)),
                  onPressed: () => _onSearch(term),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.white.withOpacity(0.08))),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSearchResults(List<Product> results) {
    if (results.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.searchX, size: 64, color: Colors.white.withOpacity(0.1)),
            const SizedBox(height: 16),
            Text('No products found for "$_query"', style: const TextStyle(color: Colors.white54, fontSize: 14)),
            const SizedBox(height: 8),
            const Text('Try searching with different keywords or clear filters', style: TextStyle(color: Colors.white24, fontSize: 12)),
          ],
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Text('${results.length} Products Found', style: const TextStyle(color: Colors.white54, fontSize: 12)),
              const Spacer(),
              Text('Sort: ${_sortBy.toUpperCase()}', style: const TextStyle(color: AppConstants.accentColor, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 80),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.62,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: results.length,
            itemBuilder: (_, i) => ProductCard(product: results[i]),
          ),
        ),
      ],
    );
  }
}
