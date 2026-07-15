import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../models/auth/user.dart';

class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  /// Crée l’utilisateur dans Firebase Auth **et** dans Firestore
  Future<UserModel> signup({
    required String name,
    required String email,
    required String password,
  }) async {
    // 1️⃣ Création dans Firebase Auth
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );
    final uid = cred.user!.uid;
    print('✅ Auth created, uid=$uid');

    // 2️⃣ Écriture dans Firestore avec logs
    final userDoc = _db.collection('users').doc(uid);
    try {
      print('➡️ Firestore: writing users/$uid …');
      await userDoc.set({
        'name': name,
        'email': email,
        'role': 'simple_user',
        'teamId': null,
        'createdAt': FieldValue.serverTimestamp(),
      });
      print('✅ Firestore write complete');
    } catch (e, st) {
      print('❌ Firestore write ERROR: $e\n$st');
      rethrow;
    }

    // 3️⃣ Lecture et renvoi du UserModel
    final snap = await userDoc.get();
    print('📄 Firestore read: ${snap.data()}');
    return UserModel.fromFirestore(snap);
  }

  /// Connexion : on s’authentifie puis on récupère le doc Firestore
  Future<UserModel> login({
    required String email,
    required String password,
  }) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    final uid = cred.user!.uid;

    final snap = await _db.collection('users').doc(uid).get();
    if (!snap.exists) {
      throw FirebaseAuthException(
        code: 'user-not-found-in-firestore',
        message: 'Profil non trouvé en base Firestore',
      );
    }
    return UserModel.fromFirestore(snap);
  }

  /// Déconnexion
  Future<void> logout() async {
    await _auth.signOut();
  }

  /// Récupère le UserModel depuis Firestore si déjà connecté
  Future<UserModel?> getCurrentUserModel() async {
    final fbUser = _auth.currentUser;
    if (fbUser == null) return null;
    final snap = await _db.collection('users').doc(fbUser.uid).get();
    if (!snap.exists) return null;
    return UserModel.fromFirestore(snap);
  }
}
