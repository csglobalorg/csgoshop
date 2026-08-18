import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../providers/product_provider.dart';
import '../../data/models/product.dart';
import '../widgets/product_card.dart';

class CategoryScreen extends ConsumerStatefulWidget {
  final String category;
  final String? title;

  const CategoryScreen({super.key, required this.category, this.title});

  @override
  ConsumerState<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends ConsumerState<CategoryScreen> {
  String? selectedSubcategory;
  String? selectedSubType;
  bool _isSearching = false;
  String _searchQuery = '';
  final TextEditingController _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final productState = ref.watch(productProvider);
    final allProducts = productState.products;

    List<Product> baseProducts;
    String screenTitle;

    // ── Base filter by category ──────────────────────────────────────────
    if (widget.category == 'all' || widget.category.isEmpty) {
      baseProducts = List.from(allProducts);
      screenTitle = widget.title ?? 'All Categories';
    } else if (widget.category == 'trending') {
      baseProducts = allProducts.where((p) => p.isTrending).toList();
      if (baseProducts.length < 8) {
        baseProducts.addAll(
          allProducts
              .where((p) => !baseProducts.contains(p))
              .take(20 - baseProducts.length),
        );
      }
      screenTitle = widget.title ?? 'Trending Now';
    } else if (widget.category == 'new_arrivals') {
      baseProducts = List.from(allProducts)
        ..sort((a, b) => b.id.compareTo(a.id));
      baseProducts = baseProducts.take(40).toList();
      screenTitle = widget.title ?? 'New Arrivals';
    } else if (widget.category == 'top_deals') {
      baseProducts = allProducts
          .where((p) => p.originalPrice > p.price)
          .toList()
        ..sort((a, b) => b.discountPercent.compareTo(a.discountPercent));
      baseProducts = baseProducts.take(40).toList();
      screenTitle = widget.title ?? 'Top Deals';
    } else {
      // Handle short category keys sent from the home screen category cards
      // e.g. "Men's" → "Men's Fashion", "Women's" → "Women's Fashion", etc.
      final searchCat = widget.category.toLowerCase();
      baseProducts = allProducts.where((p) {
        final cat = p.category.toLowerCase();
        if (searchCat == "men's" || searchCat == "men's fashion") {
          return (cat.contains("men's") || cat.contains("men's fashion")) && !cat.contains("women's");
        }
        if (searchCat == "women's" || searchCat == "women's fashion") {
          return cat.contains("women's") || cat.contains("women's fashion");
        }
        if (searchCat == 'gadgets' || searchCat == 'gadgets & electronics') {
          return cat.contains('gadget') || cat.contains('electronic');
        }
        if (searchCat == 'home' || searchCat == 'home & lifestyle') {
          return cat.contains('home') || cat.contains('lifestyle');
        }
        if (searchCat == 'kids' || searchCat == 'kids zone') {
          return cat.contains('kid') || cat.contains('zone');
        }
        if (searchCat == 'beauty' || searchCat == 'others') {
          return cat.contains('beauty') ||
              cat.contains('grooming') ||
              cat.contains('cosmetic') ||
              cat == 'others' ||
              cat.contains('other');
        }
        return cat == searchCat || cat.contains(searchCat);
      }).toList();
      screenTitle = widget.title ?? widget.category;
    }

    // ── Subcategory chips ─────────────────────────────────────────────────
    final Map<String, int> subcategoryCounts = {};
    for (var p in baseProducts) {
      final sc = p.subcategory?.trim();
      if (sc != null && sc.isNotEmpty) {
        subcategoryCounts[sc] = (subcategoryCounts[sc] ?? 0) + 1;
      }
    }
    final List<String> subcategories = subcategoryCounts.keys.toList()
      ..sort((a, b) => subcategoryCounts[b]!.compareTo(subcategoryCounts[a]!));

    // ── Filter by subcategory ─────────────────────────────────────────────
    List<Product> displayProducts = baseProducts;
    if (selectedSubcategory != null) {
      displayProducts = baseProducts
          .where((p) => p.subcategory?.trim() == selectedSubcategory)
          .toList();
    }

    // ── SubType chips ─────────────────────────────────────────────────────
    final Map<String, int> subTypeCounts = {};
    if (selectedSubcategory != null) {
      for (var p in displayProducts) {
        final st = p.subType?.trim();
        if (st != null && st.isNotEmpty) {
          subTypeCounts[st] = (subTypeCounts[st] ?? 0) + 1;
        }
      }
    }
    final List<String> subTypes = subTypeCounts.keys.toList()
      ..sort((a, b) => subTypeCounts[b]!.compareTo(subTypeCounts[a]!));

    // ── Filter by subType ─────────────────────────────────────────────────
    if (selectedSubType != null) {
      displayProducts = displayProducts
          .where((p) => p.subType?.trim() == selectedSubType)
          .toList();
    }

    // ── Search filter ─────────────────────────────────────────────────────
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      displayProducts = displayProducts.where((p) {
        return p.name.toLowerCase().contains(q) ||
            (p.subcategory?.toLowerCase().contains(q) ?? false) ||
            p.category.toLowerCase().contains(q);
      }).toList();
    }

    final bool showSubcategories = subcategories.isNotEmpty &&
        !['trending', 'new_arrivals', 'top_deals'].contains(widget.category);
    final bool showSubTypes = subTypes.isNotEmpty && showSubcategories;

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: AppConstants.surfaceColor,
        elevation: 0,
        title: _isSearching
            ? TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Search in $screenTitle...',
                  hintStyle:
                      TextStyle(color: Colors.white.withOpacity(0.35)),
                  border: InputBorder.none,
                ),
                onChanged: (v) => setState(() => _searchQuery = v),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    screenTitle,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    '${displayProducts.length} items found',
                    style: const TextStyle(
                      fontSize: 11,
                      color: Colors.white38,
                    ),
                  ),
                ],
              ),
        actions: [
          IconButton(
            onPressed: () {
              setState(() {
                _isSearching = !_isSearching;
                if (!_isSearching) {
                  _searchQuery = '';
                  _searchCtrl.clear();
                }
              });
            },
            icon: Icon(
              _isSearching ? Icons.close : LucideIcons.search,
              size: 20,
              color: Colors.white70,
            ),
          ),
          if (!_isSearching)
            IconButton(
              onPressed: () {
                // Sort: could be expanded later
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Sort/Filter coming soon'),
                    duration: Duration(seconds: 1),
                  ),
                );
              },
              icon: const Icon(LucideIcons.sliders, size: 20, color: Colors.white70),
            ),
        ],
      ),
      body: Column(
        children: [
          // ── Level 2: Subcategory chips ──────────────────────────────────
          if (showSubcategories)
            Container(
              height: 44,
              margin: const EdgeInsets.only(top: 10, bottom: 4),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: subcategories.length + 1,
                itemBuilder: (context, index) {
                  final isAll = index == 0;
                  final subcat = isAll ? 'All' : subcategories[index - 1];
                  final isSelected =
                      isAll ? selectedSubcategory == null : selectedSubcategory == subcat;
                  final count =
                      isAll ? baseProducts.length : subcategoryCounts[subcat];

                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(isAll ? 'All ($count)' : '$subcat ($count)'),
                      selected: isSelected,
                      onSelected: (_) {
                        setState(() {
                          selectedSubcategory = isAll ? null : subcat;
                          selectedSubType = null;
                          _searchQuery = '';
                          _searchCtrl.clear();
                        });
                      },
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.black : Colors.white70,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      selectedColor: AppConstants.accentColor,
                      backgroundColor: AppConstants.surfaceColor,
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(
                          color: isSelected
                              ? Colors.transparent
                              : Colors.white.withOpacity(0.05),
                        ),
                      ),
                      showCheckmark: false,
                    ),
                  );
                },
              ),
            ),

          // ── Level 3: SubType chips ──────────────────────────────────────
          if (showSubTypes)
            Container(
              height: 38,
              margin: const EdgeInsets.only(bottom: 6),
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: subTypes.length + 1,
                itemBuilder: (context, index) {
                  final isAll = index == 0;
                  final label = isAll
                      ? '✦ সব ${selectedSubcategory ?? ''}'
                      : subTypes[index - 1];
                  // Count for 'All' is total items in the selected subcategory
                  final allCount = baseProducts
                      .where((p) => p.subcategory?.trim() == selectedSubcategory)
                      .length;
                  final count =
                      isAll ? allCount : subTypeCounts[subTypes[index - 1]];
                  // Correct selection: "All" means selectedSubType == null
                  final isSelected =
                      isAll ? selectedSubType == null : selectedSubType == subTypes[index - 1];

                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text('$label ($count)'),
                      selected: isSelected,
                      onSelected: (_) {
                        setState(() {
                          selectedSubType = isAll ? null : subTypes[index - 1];
                        });
                      },
                      labelStyle: TextStyle(
                        color: isSelected
                            ? AppConstants.backgroundColor
                            : Colors.white60,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 11,
                      ),
                      selectedColor: AppConstants.accentColor,
                      backgroundColor: const Color(0xFF1E293B),
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSelected
                              ? Colors.transparent
                              : Colors.white.withOpacity(0.1),
                        ),
                      ),
                      showCheckmark: false,
                    ),
                  );
                },
              ),
            ),

          // ── Product Grid ────────────────────────────────────────────────
          Expanded(
            child: displayProducts.isEmpty
                ? Center(
                    child: productState.isLoading
                        ? const CircularProgressIndicator(
                            color: AppConstants.accentColor)
                        : Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(LucideIcons.packageSearch,
                                  color: Colors.white10, size: 80),
                              const SizedBox(height: 16),
                              Text(
                                _searchQuery.isNotEmpty
                                    ? 'No results for "$_searchQuery"'
                                    : 'No items found',
                                style:
                                    const TextStyle(color: Colors.white38),
                              ),
                            ],
                          ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.6,
                      crossAxisSpacing: 14,
                      mainAxisSpacing: 14,
                    ),
                    itemCount: displayProducts.length,
                    itemBuilder: (context, index) =>
                        ProductCard(product: displayProducts[index]),
                  ),
          ),
        ],
      ),
    );
  }
}
