import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';

const _kFreeSpins    = 'spin_daily_free';
const _kOrderSpins   = 'spin_order_bonus';
const _kLastSpinDate = 'spin_last_date';

class RewardsScreen extends ConsumerStatefulWidget {
  const RewardsScreen({super.key});
  @override
  ConsumerState<RewardsScreen> createState() => _RewardsScreenState();
}

class _RewardsScreenState extends ConsumerState<RewardsScreen> {
  int _coins = 0;
  int _checkinStreak = 0;
  int _dailyFreeSpins = 5;
  int _orderBonusSpins = 0;
  bool _claimedToday = false;
  bool _spinning = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      await _loadSpinCounts();
      _syncProfileRewards();
    });
  }

  Future<void> _loadSpinCounts() async {
    final prefs = await SharedPreferences.getInstance();
    final todayStr  = _todayStr();
    final savedDate = prefs.getString(_kLastSpinDate) ?? '';

    int freeSpins;
    int orderSpins;

    if (savedDate != todayStr) {
      freeSpins  = 5;
      orderSpins = prefs.getInt(_kOrderSpins) ?? 0;
      await prefs.setString(_kLastSpinDate, todayStr);
      await prefs.setInt(_kFreeSpins, 5);
      await prefs.setInt(_kOrderSpins, orderSpins);
    } else {
      freeSpins  = prefs.getInt(_kFreeSpins)  ?? 5;
      orderSpins = prefs.getInt(_kOrderSpins) ?? 0;
    }

    if (mounted) {
      setState(() {
        _dailyFreeSpins  = freeSpins;
        _orderBonusSpins = orderSpins;
      });
    }
  }

  Future<void> _saveSpinCounts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kFreeSpins, _dailyFreeSpins);
    await prefs.setInt(_kOrderSpins, _orderBonusSpins);
    await prefs.setString(_kLastSpinDate, _todayStr());
  }

  String _todayStr() => DateTime.now().toIso8601String().substring(0, 10);

  void _syncProfileRewards() {
    final profile = ref.read(authProvider).profile;
    if (profile != null) {
      final coins    = (profile['csgo_coins'] as num?)?.toInt() ?? 0;
      final streak   = (profile['checkin_streak'] as num?)?.toInt() ?? 0;
      final lastDate = (profile['last_checkin_date'] ?? '').toString();
      final todayStr = _todayStr();
      final yesterday    = DateTime.now().subtract(const Duration(days: 1));
      final yesterdayStr = yesterday.toIso8601String().substring(0, 10);
      int currentStreak = streak;
      if (lastDate != todayStr && lastDate != yesterdayStr && lastDate.isNotEmpty) {
        currentStreak = 0;
      }
      setState(() {
        _coins         = coins;
        _checkinStreak = currentStreak;
        _claimedToday  = (lastDate == todayStr);
      });
    }
  }

  Future<void> _saveCoinsToSupabase({
    required int newCoins,
    String? lastCheckinDate,
    int? newStreak,
    double? newWalletBalance,
  }) async {
    final authState = ref.read(authProvider);
    if (!authState.isAuthenticated) return;
    final updates = <String, dynamic>{'csgo_coins': newCoins};
    if (lastCheckinDate  != null) updates['last_checkin_date'] = lastCheckinDate;
    if (newStreak        != null) updates['checkin_streak']    = newStreak;
    if (newWalletBalance != null) updates['wallet_balance']    = newWalletBalance;
    ref.read(authProvider.notifier).updateProfile(updates);
    try {
      await http.post(
        Uri.parse('https://sdbgeuyzepwnxpresktm.supabase.co/functions/v1/supabase-user-data'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'action': 'update_profile',
          'auth':   {'phone': authState.profile!['phone']},
          'data':   updates,
        }),
      );
    } catch (e) {
      debugPrint('Error saving rewards: $e');
    }
  }

  int _calculateTodayReward(int nextStreak) {
    if (nextStreak <= 1) return 10;
    if (nextStreak == 2) return 20;
    if (nextStreak == 3) return 30;
    if (nextStreak == 4) return 40;
    if (nextStreak == 5) return 50;
    if (nextStreak == 6) return 60;
    return 70;
  }

  void _claimDailyCheckIn() {
    if (_claimedToday) return;
    final todayStr   = _todayStr();
    final nextStreak = _checkinStreak + 1;
    final reward     = _calculateTodayReward(nextStreak);
    final newCoins   = _coins + reward;
    setState(() {
      _coins         = newCoins;
      _checkinStreak = nextStreak;
      _claimedToday  = true;
    });
    _saveCoinsToSupabase(newCoins: newCoins, lastCheckinDate: todayStr, newStreak: nextStreak);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('🎉 Day $nextStreak Bonus Claimed: +$reward CSGO Coins!'),
      backgroundColor: Colors.purple,
      behavior: SnackBarBehavior.floating,
    ));
  }

  void _spinWheel() {
    if (_spinning) return;

    // Only allow free or order bonus spins — NO paid coin spin
    if (_dailyFreeSpins <= 0 && _orderBonusSpins <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('No spins left! Place a order to get +2 bonus spins.'),
        backgroundColor: Colors.orange,
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }

    final bool isFreeSpin  = _dailyFreeSpins > 0;
    final int newFreeSpins  = isFreeSpin ? _dailyFreeSpins  - 1 : _dailyFreeSpins;
    final int newOrderSpins = isFreeSpin ? _orderBonusSpins : _orderBonusSpins - 1;

    setState(() {
      _spinning        = true;
      _dailyFreeSpins  = newFreeSpins;
      _orderBonusSpins = newOrderSpins;
    });

    // Persist immediately
    _saveSpinCounts();

    Timer(const Duration(seconds: 2), () {
      if (!mounted) return;
      final reward     = (Random().nextInt(5) + 1) * 10;
      final finalCoins = _coins + reward;
      setState(() { _coins = finalCoins; _spinning = false; });
      _saveCoinsToSupabase(newCoins: finalCoins);
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Congratulations!', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          content: Text('You won $reward CSGO Coins in the Lucky Spin!', style: const TextStyle(color: Colors.white70, fontSize: 14)),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Awesome!', style: TextStyle(color: AppConstants.accentColor, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      );
    });
  }

  void _convertCoinsToWallet() {
    if (_coins < 100) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
        content: Text('Minimum 100 Coins required (100 Coins = 1 Wallet Balance)'),
        behavior: SnackBarBehavior.floating,
      ));
      return;
    }
    final convertUnits   = _coins ~/ 100;
    final convertTaka    = convertUnits * 1;
    final usedCoins      = convertUnits * 100;
    final remainingCoins = _coins - usedCoins;
    final currentWallet  = (ref.read(authProvider).profile?['wallet_balance'] as num?)?.toDouble() ?? 0.0;
    final newWallet = currentWallet + convertTaka;
    setState(() => _coins = remainingCoins);
    _saveCoinsToSupabase(newCoins: remainingCoins, newWalletBalance: newWallet);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('Converted $usedCoins Coins to $convertTaka Wallet!'),
      backgroundColor: Colors.green,
      behavior: SnackBarBehavior.floating,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final profile      = ref.watch(authProvider).profile;
    final displayCoins = profile != null && profile['csgo_coins'] != null
        ? (profile['csgo_coins'] as num).toInt()
        : _coins;
    final totalSpins       = _dailyFreeSpins + _orderBonusSpins;
    final nextStreakDisplay = _claimedToday ? _checkinStreak : _checkinStreak + 1;
    final todayRewardCoins = _calculateTodayReward(nextStreakDisplay);
    final canSpin          = totalSpins > 0;  // Only free + order spins allowed

    return Scaffold(
      backgroundColor: const Color(0xFF09090B),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('CSGO Rewards & Games', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFFEC4899), Color(0xFF8B5CF6)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: Colors.pink.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.sparkles, color: Colors.amber, size: 42),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Available CSGO Coins', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text('$displayCoins Coins', style: const TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.bold)),
                        const Text('100 Coins = 1 Wallet Balance', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: _convertCoinsToWallet,
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.black, elevation: 4, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                    child: const Text('Convert', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Daily Check-in', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                if (_checkinStreak > 0)
                  Text('Streak: $_checkinStreak Days', style: const TextStyle(color: Colors.amber, fontSize: 13, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: const Color(0xFF18181B), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.12))),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Day $nextStreakDisplay Check-in Bonus', style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('Get +$todayRewardCoins Free Coins today!', style: const TextStyle(color: Colors.white70, fontSize: 13)),
                        ],
                      ),
                      ElevatedButton.icon(
                        onPressed: _claimedToday ? null : _claimDailyCheckIn,
                        icon: Icon(_claimedToday ? Icons.check : LucideIcons.gift, size: 16),
                        label: Text(_claimedToday ? 'Claimed' : 'Claim +$todayRewardCoins'),
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black, disabledBackgroundColor: Colors.white24, disabledForegroundColor: Colors.white54, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(7, (index) {
                        final dayNum      = index + 1;
                        final dayCoins    = dayNum * 10;
                        final isCompleted = dayNum <= _checkinStreak;
                        final isCurrent   = dayNum == nextStreakDisplay && !_claimedToday;
                        return Container(
                          margin: const EdgeInsets.only(right: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: isCompleted ? Colors.purple.withOpacity(0.3) : isCurrent ? Colors.amber.withOpacity(0.2) : Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isCurrent ? Colors.amber : isCompleted ? Colors.purpleAccent : Colors.white.withOpacity(0.1)),
                          ),
                          child: Column(
                            children: [
                              Text('Day $dayNum', style: TextStyle(color: isCurrent ? Colors.amber : Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text('+$dayCoins', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        );
                      }),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const Text('Lucky Spin Wheel', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: const Color(0xFF18181B), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.purple.withOpacity(0.5))),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _badgeChip('Daily Free: $_dailyFreeSpins/5', Colors.purpleAccent),
                      const SizedBox(width: 8),
                      _badgeChip('Order Bonus: $_orderBonusSpins', Colors.amber),
                    ],
                  ),
                  const SizedBox(height: 20),
                  AnimatedRotation(
                    turns: _spinning ? 4.0 : 0.0,
                    duration: const Duration(seconds: 2),
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(color: Colors.purple.withOpacity(0.2), shape: BoxShape.circle, border: Border.all(color: Colors.purpleAccent, width: 3.5)),
                      child: const Icon(LucideIcons.dices, size: 64, color: Colors.pinkAccent),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('Spin & Win Up to 50 Coins!', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(
                    totalSpins > 0
                        ? 'You have $totalSpins FREE Spins available today!'
                        : 'No spins left! Place a order for +2 bonus spins.',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: 220,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: (_spinning || !canSpin) ? null : _spinWheel,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: canSpin ? Colors.pinkAccent : Colors.grey.shade700,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.grey.shade800,
                        disabledForegroundColor: Colors.white38,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 4,
                      ),
                      child: _spinning
                          ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                          : Text(
                              totalSpins > 0 ? 'FREE SPIN NOW' : 'NO SPINS LEFT',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                            ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                    child: const Row(
                      children: [
                        Icon(LucideIcons.shoppingBag, color: Colors.amber, size: 18),
                        SizedBox(width: 10),
                        Expanded(child: Text('Earn +2 Bonus Spins for every 1,000 order placed on CSGO SHOP!', style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.3))),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _badgeChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: color.withOpacity(0.18), borderRadius: BorderRadius.circular(8), border: Border.all(color: color.withOpacity(0.4))),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
    );
  }
}
