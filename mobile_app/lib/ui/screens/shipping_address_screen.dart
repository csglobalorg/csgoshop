import 'package:flutter/material.dart';
import '../../core/constants.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../providers/address_provider.dart';

class ShippingAddressScreen extends ConsumerWidget {
  const ShippingAddressScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addressState = ref.watch(addressProvider);
    final addresses = addressState.addresses;

    return Scaffold(
      backgroundColor: AppConstants.backgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Shipping Address', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: addressState.isLoading
          ? const Center(child: CircularProgressIndicator())
          : addresses.isEmpty
              ? const Center(
                  child: Text('No saved addresses.', style: TextStyle(color: Colors.white54, fontSize: 16)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: addresses.length,
                  itemBuilder: (context, index) {
                    final addr = addresses[index];
                    final isDefault = addr['isDefault'] == true;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppConstants.surfaceColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: isDefault ? AppConstants.accentColor : Colors.transparent, width: 1.5),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(isDefault ? LucideIcons.checkCircle2 : LucideIcons.mapPin, 
                                  color: isDefault ? AppConstants.accentColor : Colors.white54, size: 20),
                              const SizedBox(width: 8),
                              Text(addr['title'], style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                              const Spacer(),
                              IconButton(
                                icon: const Icon(LucideIcons.trash2, size: 18, color: Colors.redAccent),
                                onPressed: () => ref.read(addressProvider.notifier).deleteAddress(addr['id']),
                                constraints: const BoxConstraints(),
                                padding: EdgeInsets.zero,
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(addr['address'], style: const TextStyle(color: Colors.white70, fontSize: 14)),
                        ],
                      ),
                    );
                  },
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _addAddressModal(context, ref),
        backgroundColor: AppConstants.accentColor,
        child: const Icon(LucideIcons.plus, color: Colors.white),
      ),
    );
  }

  void _addAddressModal(BuildContext context, WidgetRef ref) {
    final titleController = TextEditingController();
    final addressController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
          left: 20, right: 20, top: 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Add New Address', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
            const SizedBox(height: 20),
            TextField(
              controller: titleController,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Title (e.g. Home, Work)',
                labelStyle: TextStyle(color: Colors.white54),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: addressController,
              style: const TextStyle(color: Colors.white),
              maxLines: 2,
              decoration: const InputDecoration(
                labelText: 'Full Address',
                labelStyle: TextStyle(color: Colors.white54),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () {
                  if (titleController.text.isEmpty || addressController.text.isEmpty) return;
                  ref.read(addressProvider.notifier).saveAddress({
                    'id': DateTime.now().millisecondsSinceEpoch.toString(),
                    'title': titleController.text,
                    'address': addressController.text,
                    'is_default': false,
                  });
                  Navigator.pop(context);
                },
                style: ElevatedButton.styleFrom(backgroundColor: AppConstants.accentColor),
                child: const Text('Save Address'),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
