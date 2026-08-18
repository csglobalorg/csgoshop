import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum ConnectivityStatus { isConnected, isDisconnected, notDetermined }

class ConnectivityService extends StateNotifier<ConnectivityStatus> {
  ConnectivityStatus lastResult = ConnectivityStatus.notDetermined;
  ConnectivityStatus newState = ConnectivityStatus.notDetermined;

  ConnectivityService() : super(ConnectivityStatus.isConnected) {
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty) {
        _updateState(results.first);
      }
    });
  }

  void _updateState(ConnectivityResult result) {
    switch (result) {
      case ConnectivityResult.mobile:
      case ConnectivityResult.wifi:
      case ConnectivityResult.ethernet:
        newState = ConnectivityStatus.isConnected;
        break;
      case ConnectivityResult.none:
        newState = ConnectivityStatus.isDisconnected;
        break;
      default:
        newState = ConnectivityStatus.notDetermined;
    }

    if (newState != state) {
      state = newState;
    }
  }
}

final connectivityProvider = StateNotifierProvider<ConnectivityService, ConnectivityStatus>((ref) {
  return ConnectivityService();
});

class OfflineWrapper extends ConsumerWidget {
  final Widget child;
  const OfflineWrapper({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(connectivityProvider);

    if (status == ConnectivityStatus.isDisconnected) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.wifi_off, size: 80, color: Colors.white24),
              const SizedBox(height: 24),
              const Text(
                'No Internet Connection',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              const Text(
                'Please check your network settings',
                style: TextStyle(color: Colors.white54),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  // Connectivity check happens automatically
                },
                child: const Text('Try Again'),
              ),
            ],
          ),
        ),
      );
    }

    return child;
  }
}
