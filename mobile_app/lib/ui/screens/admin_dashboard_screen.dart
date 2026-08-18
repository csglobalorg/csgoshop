import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:url_launcher/url_launcher.dart';
import '../../core/constants.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  WebViewController? _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(AppConstants.backgroundColor)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (String url) {
              setState(() {
                _isLoading = true;
              });
            },
            onPageFinished: (String url) {
              setState(() {
                _isLoading = false;
              });
            },
            onWebResourceError: (WebResourceError error) {
              setState(() {
                _isLoading = false;
              });
            },
          ),
        )
        ..loadRequest(Uri.parse('https://csgoshop.zya.me/admin.html'));
    } else {
      _isLoading = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        title: const Text('Admin Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppConstants.surfaceColor,
        elevation: 0,
        actions: [
          if (!kIsWeb)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: () {
                _controller?.reload();
                setState(() {
                  _isLoading = true;
                });
              },
            ),
        ],
      ),
      body: SafeArea(
        child: kIsWeb
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppConstants.surfaceColor,
                          shape: BoxShape.circle,
                          border: Border.all(color: AppConstants.borderColor),
                        ),
                        child: const Icon(Icons.admin_panel_settings_outlined, size: 64, color: AppConstants.accentColor),
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Web Admin Dashboard',
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'For security and browser compatibility reasons, the admin panel must be opened in a new browser tab.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white54, fontSize: 14),
                      ),
                      const SizedBox(height: 32),
                      ElevatedButton.icon(
                        onPressed: () {
                          launchUrl(
                            Uri.parse('https://csgoshop.zya.me/admin.html'),
                            mode: LaunchMode.externalApplication,
                          );
                        },
                        icon: const Icon(Icons.open_in_new, color: Colors.black, size: 18),
                        label: const Text('LAUNCH ADMIN PANEL'),
                      ),
                    ],
                  ),
                ),
              )
            : Stack(
                children: [
                  WebViewWidget(controller: _controller!),
                  if (_isLoading)
                    Container(
                      color: AppConstants.backgroundColor,
                      child: const Center(
                        child: CircularProgressIndicator(color: AppConstants.accentColor),
                      ),
                    ),
                ],
              ),
      ),
    );
  }
}
