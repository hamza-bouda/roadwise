// lib/screens/settings_screen.dart
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import '../../providers/user/theme_provider.dart';
import 'package:package_info_plus/package_info_plus.dart';
import '../auth/login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _notifications = true;
  bool _locationServices = true;
  String _appVersion = '';
  final user = FirebaseAuth.instance.currentUser;

  @override
  void initState() {
    super.initState();
    _loadAppVersion();
  }

  Future<void> _loadAppVersion() async {
    final packageInfo = await PackageInfo.fromPlatform();
    setState(() {
      _appVersion = '${packageInfo.version} (${packageInfo.buildNumber})';
    });
  }

  void _toggleNotifications(bool value) {
    setState(() => _notifications = value);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(value ? 'Notifications activées' : 'Notifications désactivées'),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _toggleLocationServices(bool value) {
    setState(() => _locationServices = value);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(value ? 'Services de localisation activés' : 'Services de localisation désactivés'),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _signOut() async {
    try {
      final navigator = Navigator.of(context);
      final messenger = ScaffoldMessenger.of(context);
      
      final result = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Déconnexion'),
          content: const Text('Êtes-vous sûr de vouloir vous déconnecter ?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Annuler'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              style: FilledButton.styleFrom(
                backgroundColor: Colors.red,
              ),
              child: const Text('Déconnecter'),
            ),
          ],
        ),
      );

      if (result == true) {
        await FirebaseAuth.instance.signOut();
        // Redirection vers l'écran de connexion et suppression de l'historique de navigation
        navigator.pushNamedAndRemoveUntil(
          LoginScreen.routeName,
          (route) => false,
        );
        
        messenger.showSnackBar(
          const SnackBar(
            content: Text('Vous avez été déconnecté'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Erreur lors de la déconnexion: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildUserAvatar() {
    final email = user?.email;
    if (email == null) return const SizedBox.shrink();
    
    return Column(
      children: [
        const SizedBox(height: 16),
        Center(
          child: Hero(
            tag: 'profile_avatar',
            child: CircleAvatar(
              radius: 40,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Text(
                email.substring(0, 1).toUpperCase(),
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onPrimary,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Text(
            email,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final textTheme = theme.textTheme;
    final themeProvider = context.watch<ThemeProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Paramètres'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            onPressed: () {
              showDialog(
                context: context,
                builder: (context) => AlertDialog(
                  title: const Text('Aide'),
                  content: const Text('Besoin d\'aide avec les paramètres ? Contactez notre support à support@smartroute.com'),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Fermer'),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
      body: ListView(
        children: [
          if (user != null) _buildUserAvatar(),

          _buildSectionTitle('Préférences'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 2,
            child: Column(
              children: [
                SwitchListTile.adaptive(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  title: const Text('Mode sombre'),
                  subtitle: Text(
                    themeProvider.isDark ? 'Activé' : 'Désactivé',
                    style: textTheme.bodySmall,
                  ),
                  secondary: Icon(Icons.dark_mode, color: colorScheme.primary),
                  value: themeProvider.isDark,
                  onChanged: (v) => context.read<ThemeProvider>().toggleDarkMode(v),
                ),
                const Divider(height: 1),
                SwitchListTile.adaptive(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  title: const Text('Notifications'),
                  subtitle: Text(
                    _notifications ? 'Activées' : 'Désactivées',
                    style: textTheme.bodySmall,
                  ),
                  secondary: Icon(Icons.notifications, color: colorScheme.primary),
                  value: _notifications,
                  onChanged: _toggleNotifications,
                ),
                const Divider(height: 1),
                SwitchListTile.adaptive(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  title: const Text('Services de localisation'),
                  subtitle: Text(
                    _locationServices ? 'Activés' : 'Désactivés',
                    style: textTheme.bodySmall,
                  ),
                  secondary: Icon(Icons.location_on, color: colorScheme.primary),
                  value: _locationServices,
                  onChanged: _toggleLocationServices,
                ),
              ],
            ),
          ),

          _buildSectionTitle('Application'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 2,
            child: Column(
              children: [
                ListTile(
                  leading: Icon(Icons.language, color: colorScheme.primary),
                  title: const Text('Langue'),
                  subtitle: const Text('Français'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {
                    showModalBottomSheet(
                      context: context,
                      builder: (context) => Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ListTile(
                            title: const Text('Français'),
                            trailing: const Icon(Icons.check),
                            onTap: () => Navigator.pop(context),
                          ),
                          ListTile(
                            title: const Text('English'),
                            onTap: () => Navigator.pop(context),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const Divider(height: 1),
                ListTile(
                  leading: Icon(Icons.info_outline, color: colorScheme.primary),
                  title: const Text('À propos'),
                  subtitle: Text('Version $_appVersion'),
                  onTap: () {
                    showAboutDialog(
                      context: context,
                      applicationName: 'SmartRoute',
                      applicationVersion: _appVersion,
                      applicationIcon: Icon(Icons.map, size: 48, color: colorScheme.primary),
                      children: const [
                        Text('Application de détection et de signalement de nids-de-poule.'),
                        SizedBox(height: 8),
                        Text('Développée avec ❤️ pour améliorer nos routes.'),
                      ],
                    );
                  },
                ),
              ],
            ),
          ),

          _buildSectionTitle('Compte'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 2,
            child: ListTile(
              leading: Icon(Icons.logout, color: colorScheme.error),
              title: Text('Se déconnecter', style: TextStyle(color: colorScheme.error)),
              onTap: _signOut,
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}
