import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:ota_update/ota_update.dart';
import '../../data/models/product.dart';
import '../../providers/product_provider.dart';
import '../../providers/auth_provider.dart';
import '../widgets/product_card.dart';
import '../widgets/product_skeleton.dart';
import '../widgets/flash_sale_card.dart';
import 'product_details_screen.dart';
import 'category_screen.dart';
import '../../core/constants.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Category definition for the icon grid (Daraz style)
// ─────────────────────────────────────────────────────────────────────────────
const _homeCategories = [
  {'label': "Women's", 'catKey': "Women's Fashion", 'emoji': '👗', 'color': 0xFFEC4899},
  {'label': "Men's",   'catKey': "Men's Fashion",   'emoji': '👔', 'color': 0xFF3B82F6},
  {'label': 'Gadgets', 'catKey': 'Gadgets & Electronics', 'emoji': '📱', 'color': 0xFF8B5CF6},
  {'label': 'Home',    'catKey': 'Home & Lifestyle', 'emoji': '🏠', 'color': 0xFF10B981},
  {'label': 'Kids',    'catKey': 'Kids Zone',        'emoji': '🧸', 'color': 0xFFF59E0B},
  {'label': 'Beauty',  'catKey': 'Others',           'emoji': '💄', 'color': 0xFFEF4444},
  {'label': 'Deals',   'catKey': 'top_deals',        'emoji': '🔥', 'color': 0xFFFF6B35},
  {'label': 'New',     'catKey': 'new_arrivals',     'emoji': '✨', 'color': 0xFF06B6D4},
];

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  // Search
  bool _searching = false;
  String _searchQuery = '';
  final _searchCtrl = TextEditingController();
  final _searchFocus = FocusNode();

  // Banner carousel
  late PageController _bannerCtrl;
  int _bannerPage = 0;
  Timer? _bannerTimer;

  // Flash sale countdown
  Duration _saleLeft = const Duration(hours: 5, minutes: 23, seconds: 11);
  Timer? _saleTimer;

  @override
  void initState() {
    super.initState();
    _bannerCtrl = PageController();
    _bannerTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (_bannerCtrl.hasClients) {
        final next = (_bannerPage + 1) % 5;
        _bannerCtrl.animateToPage(next,
            duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
      }
    });
    _saleTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _saleLeft -= const Duration(seconds: 1);
          if (_saleLeft.isNegative) _saleLeft = const Duration(hours: 23, minutes: 59, seconds: 59);
        });
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkUpdates();
    });
  }

  @override
  void dispose() {
    _bannerTimer?.cancel();
    _saleTimer?.cancel();
    _bannerCtrl.dispose();
    _searchCtrl.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  // ──────────────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(productProvider);
    final authState = ref.watch(authProvider);
    final allProducts = state.products;

    // Filtered
    final filtered = _searchQuery.isEmpty
        ? <Product>[]
        : allProducts
            .where((p) =>
                p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
                p.category.toLowerCase().contains(_searchQuery.toLowerCase()))
            .toList();

    // Data slices
    final trending = allProducts.where((p) => p.isTrending).take(10).toList();
    if (trending.length < 4) trending.addAll(allProducts.where((p) => !trending.contains(p)).take(4));

    final flashDeals = (List<Product>.from(allProducts)
          ..sort((a, b) => b.discountPercent.compareTo(a.discountPercent)))
        .take(10)
        .toList();

    final newArrivals = allProducts.reversed.take(12).toList();
    final bannerProducts = allProducts.where((p) => p.isFeatured || p.isTrending).take(5).toList();
    if (bannerProducts.length < 3) bannerProducts.addAll(allProducts.take(5 - bannerProducts.length));

    final greeting = _getGreeting(authState.profile?['name']);

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            // ── HEADER ─────────────────────────────────────────────────
            _buildHeader(greeting),

            // ── BODY ───────────────────────────────────────────────────
            Expanded(
              child: _searching && _searchQuery.isNotEmpty
                  ? _buildSearchResults(filtered)
                  : RefreshIndicator(
                      onRefresh: () => ref.read(productProvider.notifier).fetchData(),
                      color: AppConstants.accentColor,
                      backgroundColor: const Color(0xFF18181B),
                      child: CustomScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        slivers: [
                          // Banner Carousel
                          if (bannerProducts.isNotEmpty)
                            SliverToBoxAdapter(child: _buildBanner(bannerProducts)),

                          // Category icons (Daraz style)
                          SliverToBoxAdapter(child: _buildCategoryGrid()),

                          // Flash Sale
                          if (flashDeals.isNotEmpty) ...[
                            SliverToBoxAdapter(child: _buildFlashSaleHeader()),
                            SliverToBoxAdapter(child: _buildFlashSaleRow(flashDeals)),
                          ],

                          // Trending
                          if (trending.isNotEmpty) ...[
                            SliverToBoxAdapter(child: _sectionHeader('🔥 Trending Now', 'trending', 'Trending Now')),
                            SliverToBoxAdapter(child: _buildHorizontalGrid(trending)),
                          ],

                          // New Arrivals grid
                          if (newArrivals.isNotEmpty) ...[
                            SliverToBoxAdapter(child: _sectionHeader('✨ New Arrivals', 'new_arrivals', 'New Arrivals')),
                            SliverPadding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              sliver: SliverGrid(
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2,
                                  childAspectRatio: 0.62,
                                  crossAxisSpacing: 10,
                                  mainAxisSpacing: 10,
                                ),
                                delegate: SliverChildBuilderDelegate(
                                  (_, i) => ProductCard(product: newArrivals[i]),
                                  childCount: newArrivals.length,
                                ),
                              ),
                            ),
                          ],

                          // Loading skeleton
                          if (state.isLoading && allProducts.isEmpty)
                            SliverPadding(
                              padding: const EdgeInsets.all(12),
                              sliver: SliverGrid(
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 2, childAspectRatio: 0.62,
                                  crossAxisSpacing: 10, mainAxisSpacing: 10,
                                ),
                                delegate: SliverChildBuilderDelegate(
                                  (_, __) => const ProductSkeleton(), childCount: 6,
                                ),
                              ),
                            ),

                          // Trust Badges Section
                          SliverToBoxAdapter(child: _buildTrustBadges()),

                          const SliverToBoxAdapter(child: SizedBox(height: 90)),
                        ],
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  // ── HEADER ─────────────────────────────────────────────────────────────────
  Widget _buildHeader(String greeting) {
    return Container(
      color: const Color(0xFF09090B),
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
      child: Column(
        children: [
          Row(
            children: [
              // Logo / greeting
              Expanded(
                child: _searching
                    ? TextField(
                        controller: _searchCtrl,
                        focusNode: _searchFocus,
                        autofocus: true,
                        style: const TextStyle(color: Colors.white, fontSize: 15),
                        decoration: InputDecoration(
                          hintText: 'Search products...',
                          hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                        ),
                        onChanged: (v) => setState(() => _searchQuery = v),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Image.asset('assets/images/app_icon.png', height: 36, fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const Text('CSGO SHOP',
                                  style: TextStyle(color: AppConstants.accentColor, fontSize: 18, fontWeight: FontWeight.w900))),
                          if (greeting.isNotEmpty)
                            Text(greeting, style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11)),
                        ],
                      ),
              ),
              // Search icon
              _iconBtn(
                _searching ? Icons.close : Icons.search,
                onTap: () {
                  setState(() {
                    _searching = !_searching;
                    if (!_searching) { _searchQuery = ''; _searchCtrl.clear(); }
                  });
                },
              ),
              const SizedBox(width: 4),
              _iconBtn(LucideIcons.bell),
            ],
          ),

          // Search bar (always visible, Daraz style)
          if (!_searching)
            GestureDetector(
              onTap: () { setState(() => _searching = true); _searchFocus.requestFocus(); },
              child: Container(
                margin: const EdgeInsets.only(top: 10),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFF18181B),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.white.withOpacity(0.07)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.search, color: Colors.white.withOpacity(0.3), size: 18),
                    const SizedBox(width: 8),
                    Text('Search in CSGO SHOP...', style: TextStyle(color: Colors.white.withOpacity(0.3), fontSize: 14)),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _iconBtn(IconData icon, {VoidCallback? onTap}) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 38, height: 38,
      decoration: BoxDecoration(
        color: const Color(0xFF18181B),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Icon(icon, color: Colors.white70, size: 18),
    ),
  );

  // ── BANNER CAROUSEL ─────────────────────────────────────────────────────────
  Widget _buildBanner(List<Product> products) {
    return Column(
      children: [
        SizedBox(
          height: 180,
          child: PageView.builder(
            controller: _bannerCtrl,
            onPageChanged: (i) => setState(() => _bannerPage = i),
            itemCount: products.length,
            itemBuilder: (_, i) {
              final p = products[i];
              return GestureDetector(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => ProductDetailsScreen(product: p))),
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 8))],
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: Product.getOptimizedImageUrl(p.thumbnailImg) ?? '',
                        fit: BoxFit.cover,
                        errorWidget: (_, __, ___) => Container(
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(colors: [Color(0xFF1E293B), Color(0xFF0F172A)]),
                          ),
                        ),
                      ),
                      // Gradient overlay
                      Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.centerLeft,
                            end: Alignment.centerRight,
                            colors: [const Color(0xFF09090B).withOpacity(0.92), Colors.transparent],
                            stops: const [0.0, 0.6],
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: AppConstants.accentColor,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(p.category.toUpperCase(),
                                  style: const TextStyle(color: Colors.black, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1)),
                            ),
                            const SizedBox(height: 6),
                            SizedBox(
                              width: 180,
                              child: Text(p.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700, height: 1.2)),
                            ),
                            const SizedBox(height: 6),
                            Text('৳${p.price.toInt()}',
                                style: const TextStyle(color: AppConstants.accentColor, fontSize: 20, fontWeight: FontWeight.w900)),
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
        // Dots
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(products.length, (i) => AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            width: _bannerPage == i ? 20 : 5,
            height: 5,
            margin: const EdgeInsets.only(right: 4),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(3),
              color: _bannerPage == i ? AppConstants.accentColor : Colors.white12,
            ),
          )),
        ),
        const SizedBox(height: 4),
      ],
    );
  }

  // ── CATEGORY ICONS (Daraz style) ────────────────────────────────────────────
  Widget _buildCategoryGrid() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 6, 12, 4),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: GridView.count(
        crossAxisCount: 4,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 0.9,
        mainAxisSpacing: 10,
        crossAxisSpacing: 4,
        children: _homeCategories.map((cat) {
          return GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => CategoryScreen(category: cat['catKey'] as String, title: cat['label'] as String),
            )),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 48, height: 48,
                  decoration: BoxDecoration(
                    color: Color(cat['color'] as int).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Color(cat['color'] as int).withOpacity(0.2)),
                  ),
                  child: Center(child: Text(cat['emoji'] as String, style: const TextStyle(fontSize: 22))),
                ),
                const SizedBox(height: 5),
                Text(
                  cat['label'] as String,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 10.5, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  // ── FLASH SALE HEADER ───────────────────────────────────────────────────────
  Widget _buildFlashSaleHeader() {
    final h = _saleLeft.inHours.toString().padLeft(2, '0');
    final m = (_saleLeft.inMinutes % 60).toString().padLeft(2, '0');
    final s = (_saleLeft.inSeconds % 60).toString().padLeft(2, '0');

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 14, 12, 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(8)),
            child: const Icon(Icons.flash_on, color: Colors.white, size: 16),
          ),
          const SizedBox(width: 8),
          const Text('Flash Sale', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(width: 10),
          _timerUnit(h), _colon(), _timerUnit(m), _colon(), _timerUnit(s),
          const Spacer(),
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => const CategoryScreen(category: 'top_deals', title: 'Top Deals'),
            )),
            child: const Text('See All ›', style: TextStyle(color: AppConstants.accentColor, fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _timerUnit(String t) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
    decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(5)),
    child: Text(t, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w800, fontFeatures: [FontFeature.tabularFigures()])),
  );

  Widget _colon() => const Padding(
    padding: EdgeInsets.symmetric(horizontal: 2),
    child: Text(':', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w900, fontSize: 14)),
  );

  // ── FLASH SALE HORIZONTAL ROW ───────────────────────────────────────────────
  Widget _buildFlashSaleRow(List<Product> deals) {
    return SizedBox(
      height: 220,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: deals.length,
        itemBuilder: (_, i) => Padding(
          padding: const EdgeInsets.only(right: 10),
          child: SizedBox(width: 140, child: FlashSaleCard(product: deals[i])),
        ),
      ),
    );
  }

  // ── SECTION HEADER ──────────────────────────────────────────────────────────
  Widget _sectionHeader(String title, String catKey, String catTitle) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 10),
      child: Row(
        children: [
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800)),
          const Spacer(),
          GestureDetector(
            onTap: () => Navigator.push(context, MaterialPageRoute(
              builder: (_) => CategoryScreen(category: catKey, title: catTitle),
            )),
            child: const Text('See All ›', style: TextStyle(color: AppConstants.accentColor, fontSize: 13, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  // ── HORIZONTAL PRODUCT ROW ──────────────────────────────────────────────────
  Widget _buildHorizontalGrid(List<Product> products) {
    return SizedBox(
      height: 235,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: products.length,
        itemBuilder: (_, i) => SizedBox(
          width: 148,
          child: Padding(
            padding: const EdgeInsets.only(right: 10),
            child: ProductCard(product: products[i]),
          ),
        ),
      ),
    );
  }

  // ── TRUST BADGES ────────────────────────────────────────────────────────────
  Widget _buildTrustBadges() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 24, 12, 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF18181B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: const [
          _TrustItem(icon: LucideIcons.truck, title: 'Fast Delivery', desc: 'All over BD'),
          _TrustItem(icon: LucideIcons.shieldCheck, title: '100% Genuine', desc: 'Authentic products'),
          _TrustItem(icon: LucideIcons.banknote, title: 'Cash on Delivery', desc: 'Pay at doorstep'),
          _TrustItem(icon: LucideIcons.headphones, title: '24/7 Support', desc: 'Helpline available'),
        ],
      ),
    );
  }

  // ── SEARCH RESULTS ──────────────────────────────────────────────────────────
  Widget _buildSearchResults(List<Product> results) {
    if (results.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search_off, size: 80, color: Colors.white.withOpacity(0.08)),
            const SizedBox(height: 16),
            Text('No results for "$_searchQuery"', style: const TextStyle(color: Colors.white38, fontSize: 14)),
          ],
        ),
      );
    }
    return GridView.builder(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 80),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, childAspectRatio: 0.62,
        crossAxisSpacing: 10, mainAxisSpacing: 10,
      ),
      itemCount: results.length,
      itemBuilder: (_, i) => ProductCard(product: results[i]),
    );
  }

  String _getGreeting(String? name) {
    final h = DateTime.now().hour;
    final greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    if (name != null && name.isNotEmpty) return '$greet, $name 👋';
    return '';
  }

  Future<void> _checkUpdates() async {
    try {
      final response = await Supabase.instance.client
          .from('site_settings')
          .select('value')
          .eq('key', 'app_version')
          .maybeSingle();

      if (response != null && response['value'] != null) {
        final Map<String, dynamic> versionData = Map<String, dynamic>.from(response['value']);
        final remoteVersion = versionData['version']?.toString() ?? '1.0.1';
        final apkUrl = versionData['apk_url']?.toString() ?? 'https://sdbgeuyzepwnxpresktm.supabase.co/storage/v1/object/public/Application/app-arm64-v8a-release.apk';
        final updateNotes = versionData['notes']?.toString() ?? 'Bug fixes and performance improvements.';

        // Current version of the app is 3.1.0
        const localVersion = '3.1.0';
        
        if (remoteVersion != localVersion && _isNewer(localVersion, remoteVersion)) {
          if (!mounted) return;
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => AlertDialog(
              backgroundColor: AppConstants.cardColor,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(LucideIcons.downloadCloud, color: AppConstants.accentColor),
                  const SizedBox(width: 10),
                  Text('Update Available (v$remoteVersion)', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('A new version of CSGO SHOP is available. Please update to continue using the app smoothly.', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 12),
                  const Text('What\'s New:', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(height: 4),
                  Text(updateNotes, style: const TextStyle(color: Colors.white54, fontSize: 12)),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Later', style: TextStyle(color: Colors.white38)),
                ),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    final uri = Uri.parse(apkUrl);
                    try {
                      if (await canLaunchUrl(uri)) {
                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                      } else {
                        showDialog(
                          context: context,
                          barrierDismissible: false,
                          builder: (context) => _DownloadProgressDialog(apkUrl: apkUrl),
                        );
                      }
                    } catch (_) {
                      showDialog(
                        context: context,
                        barrierDismissible: false,
                        builder: (context) => _DownloadProgressDialog(apkUrl: apkUrl),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: AppConstants.accentColor, foregroundColor: Colors.black),
                  child: const Text('Update Now', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
        }
      }
    } catch (e) {
      print('Error checking app updates: $e');
    }
  }

  bool _isNewer(String current, String remote) {
    try {
      final currentParts = current.split('.').map(int.parse).toList();
      final remoteParts = remote.split('.').map(int.parse).toList();
      for (var i = 0; i < 3; i++) {
        if (remoteParts[i] > currentParts[i]) return true;
        if (remoteParts[i] < currentParts[i]) return false;
      }
    } catch (_) {}
    return false;
  }
}

class _DownloadProgressDialog extends StatefulWidget {
  final String apkUrl;
  const _DownloadProgressDialog({required this.apkUrl});

  @override
  State<_DownloadProgressDialog> createState() => _DownloadProgressDialogState();
}

class _DownloadProgressDialogState extends State<_DownloadProgressDialog> {
  double _progress = 0;
  String _statusMsg = 'Starting download...';
  bool _hasError = false;
  StreamSubscription? _subscription;

  @override
  void initState() {
    super.initState();
    _startDownload();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  void _startDownload() {
    try {
      _subscription = OtaUpdate().execute(
        widget.apkUrl,
        destinationFilename: 'csgo_shop.apk',
      ).listen(
        (OtaEvent event) {
          if (!mounted) return;
          setState(() {
            if (event.status == OtaStatus.DOWNLOADING) {
              _progress = double.tryParse(event.value ?? '0') ?? 0;
              _statusMsg = 'Downloading: ${_progress.toInt()}%';
              if (_progress >= 99) {
                _triggerDirectInstallFallback();
              }
            } else if (event.status == OtaStatus.INSTALLING) {
              _statusMsg = 'Installing update...';
              _triggerDirectInstallFallback();
            } else if (event.status != OtaStatus.DOWNLOADING && event.status != OtaStatus.INSTALLING) {
              _hasError = true;
              _statusMsg = 'OTA Status: ${event.status}. Tap below to download & install directly.';
            } else {
              _statusMsg = 'Preparing installation...';
            }
          });
        },
        onError: (err) {
          if (!mounted) return;
          setState(() {
            _hasError = true;
            _statusMsg = 'Direct download required. Tap below to install update.';
          });
        },
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _hasError = true;
        _statusMsg = 'Tap below to download and install update directly.';
      });
    }
  }

  Future<void> _triggerDirectInstallFallback() async {
    try {
      final uri = Uri.parse(widget.apkUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: AppConstants.cardColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: const Text('Updating CSGO SHOP', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!_hasError) ...[
            LinearProgressIndicator(
              value: _progress > 0 ? _progress / 100 : null,
              backgroundColor: Colors.white10,
              valueColor: const AlwaysStoppedAnimation<Color>(AppConstants.accentColor),
            ),
            const SizedBox(height: 16),
            Text(
              _statusMsg,
              style: const TextStyle(color: Colors.white70, fontSize: 13),
              textAlign: TextAlign.center,
            ),
          ] else ...[
            const Icon(Icons.download_for_offline, color: AppConstants.accentColor, size: 48),
            const SizedBox(height: 12),
            Text(_statusMsg, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70, fontSize: 13)),
          ],
        ],
      ),
      actions: [
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(context);
            final uri = Uri.parse(widget.apkUrl);
            if (await canLaunchUrl(uri)) {
              await launchUrl(uri, mode: LaunchMode.externalApplication);
            }
          },
          style: ElevatedButton.styleFrom(backgroundColor: AppConstants.accentColor, foregroundColor: Colors.black),
          child: const Text('Install Now / Open Browser', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel', style: TextStyle(color: Colors.white38)),
        ),
      ],
    );
  }
}

class _TrustItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String desc;
  const _TrustItem({required this.icon, required this.title, required this.desc});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: AppConstants.accentColor, size: 22),
          const SizedBox(height: 6),
          Text(
            title,
            style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            desc,
            style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 9),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
