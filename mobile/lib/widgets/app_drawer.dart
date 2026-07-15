// lib/widgets/app_drawer.dart

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../constants/strings.dart';
import '../providers/auth/auth_provider.dart';

class AppDrawer extends StatelessWidget {
  const AppDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    return Drawer(
      child: SafeArea(
        child: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.home),
              title: const Text(AppStrings.homeTitle),
              onTap: () {
                Navigator.pop(context);
                Navigator.pushReplacementNamed(context, '/home');
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout),
              title: const Text(AppStrings.logout),
              onTap: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (_) => AlertDialog(
                    content: const Text(AppStrings.logoutConfirmation),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Non')),
                      TextButton(onPressed: () => Navigator.pop(context, true),  child: const Text('Oui')),
                    ],
                  ),
                );
                if (confirm == true) {
                  await auth.logout();
                  Navigator.pushReplacementNamed(context, '/login');
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
