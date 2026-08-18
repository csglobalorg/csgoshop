import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../core/constants.dart';

class AppTheme {
  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppConstants.backgroundColor,
      primaryColor: AppConstants.accentColor,
      colorScheme: const ColorScheme.dark(
        primary: AppConstants.accentColor,
        secondary: AppConstants.secondaryAccent,
        surface: AppConstants.cardColor,
        background: AppConstants.backgroundColor,
      ),
      textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.outfit(fontWeight: FontWeight.w800, color: Colors.white),
        displayMedium: GoogleFonts.outfit(fontWeight: FontWeight.w700, color: Colors.white),
        titleLarge: GoogleFonts.outfit(fontWeight: FontWeight.w600, color: Colors.white),
        bodyLarge: GoogleFonts.outfit(color: Colors.white70),
        bodyMedium: GoogleFonts.outfit(color: Colors.white60),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppConstants.surfaceColor.withOpacity(0.9),
        elevation: 0,
        centerTitle: true,
        scrolledUnderElevation: 0,
        systemOverlayStyle: const SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: Brightness.light,
        ),
        titleTextStyle: GoogleFonts.outfit(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
          color: Colors.white,
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppConstants.accentColor,
          foregroundColor: Colors.black,
          elevation: 4,
          shadowColor: AppConstants.accentColor.withOpacity(0.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          textStyle: GoogleFonts.outfit(fontWeight: FontWeight.w700, fontSize: 16),
        ),
      ),
      cardTheme: CardTheme(
        color: AppConstants.cardColor,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppConstants.borderRadius),
          side: const BorderSide(color: AppConstants.borderColor, width: 1.5),
        ),
      ),
      bottomNavigationBarTheme: BottomNavigationBarThemeData(
        backgroundColor: AppConstants.surfaceColor,
        selectedItemColor: AppConstants.accentColor,
        unselectedItemColor: Colors.white54,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
        selectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w600, fontSize: 12),
        unselectedLabelStyle: GoogleFonts.outfit(fontWeight: FontWeight.w500, fontSize: 12),
      ),
    );
  }
}
