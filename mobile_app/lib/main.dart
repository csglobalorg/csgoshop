import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'ui/screens/splash_screen.dart';
import 'ui/screens/home_screen.dart';
import 'ui/screens/main_screen.dart';
import 'providers/auth_provider.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent, // transparent status bar
    statusBarIconBrightness: Brightness.light, // light icons for dark background
  ));

  await Supabase.initialize(
    url: 'https://sdbgeuyzepwnxpresktm.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkYmdldXl6ZXB3bnhwcmVza3RtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NjQ4NDksImV4cCI6MjA5MTA0MDg0OX0.3tjNaOgYy_uXrsmd8wrs6NLdICVtG5d6e1pOhabtpvw',
  );

  runApp(
    const ProviderScope(
      child: CSGOShopApp(),
    ),
  );
}

class CSGOShopApp extends ConsumerStatefulWidget {
  const CSGOShopApp({super.key});

  @override
  ConsumerState<CSGOShopApp> createState() => _CSGOShopAppState();
}

class _CSGOShopAppState extends ConsumerState<CSGOShopApp> {
  @override
  void initState() {
    super.initState();
    // Initialize persistent login on app startup
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(authProvider.notifier).initialize();
    });
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CSGO SHOP',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme.copyWith(
        textTheme: GoogleFonts.outfitTextTheme(
          ThemeData.dark().textTheme,
        ),
      ),
      builder: (context, child) {
        if (!kIsWeb) return child!;
        return Scaffold(
          backgroundColor: const Color(0xFF030303),
          body: Center(
            child: Container(
              width: 420,
              height: 860,
              margin: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(40),
                border: Border.all(color: const Color(0xFF1F1F23), width: 12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.6),
                    blurRadius: 40,
                    spreadRadius: 5,
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: child,
            ),
          ),
        );
      },
      home: const SplashScreen(),
    );
  }
}
