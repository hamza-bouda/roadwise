import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import '../../models/user/report.dart';

class ReportService {
  final FirebaseFirestore _db    = FirebaseFirestore.instance;
  final FirebaseStorage   _store = FirebaseStorage.instance;

  /// Compresse l'image avant upload
  Future<File> _compressImage(File file) async {
    final dir = await getTemporaryDirectory();
    final targetPath = '${dir.path}/compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';

    final result = await FlutterImageCompress.compressAndGetFile(
      file.absolute.path,
      targetPath,
      quality: 70,
      minWidth: 1024,
      minHeight: 1024,
    );

    return File(result?.path ?? file.path);
  }

  /// Charge l'image dans Cloud Storage puis crée le document **reports/{id}**.
  Future<void> createReport({
    required File   imageFile,
    required double latitude,
    required double longitude,
    required String description,
    required String uid,  // ID de l'utilisateur courant
    DocumentReference? maintenance,
  }) async {
    final docRef    = _db.collection('reports').doc();
    final storageRef = _store.ref('reports/${docRef.id}.jpg');

    // 1. Compression de l'image
    final compressedImage = await _compressImage(imageFile);

    // 2. Upload de l'image
    await storageRef.putFile(
      compressedImage,
      SettableMetadata(contentType: 'image/jpeg'),
    );
    final imageUrl = await storageRef.getDownloadURL();

    // 3. Construction du modèle Report
    final report = Report(
      id         : docRef.id,
      description: description,
      imageUrl   : imageUrl,
      latitude   : latitude,
      longitude  : longitude,
      reportedAt : DateTime.now(),
      status     : 'NOUVEAU',
      detectedBy : _db.doc('users/$uid'),
      maintenance: maintenance,
    );

    // 4. Enregistrement dans Firestore
    await docRef.set(report.toMap());

    // 5. Nettoyage du fichier temporaire
    if (compressedImage.path != imageFile.path) {
      await compressedImage.delete();
    }
  }

  /// Flux de rapports **tous utilisateurs**, triés par date.
  Stream<List<Report>> streamAllReports() {
    return _db
        .collection('reports')
        .orderBy('reportedAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs
        .map((d) => Report.fromSnapshot(d))
        .toList());
  }


  Future<List<Report>> fetchReports() async {
    final snapshot = await _db
        .collection('reports')
        .orderBy('reportedAt', descending: true)
        .get();

    return snapshot.docs.map((doc) => Report.fromSnapshot(doc)).toList();
  }

  /// Flux de rapports **uniquement pour** l'utilisateur [uid], triés par date.
  Stream<List<Report>> streamUserReports(String uid) {
    final userRef = _db.doc('users/$uid');
    return _db
        .collection('reports')
        .where('detectedBy', isEqualTo: userRef)
        .orderBy('reportedAt', descending: true)
        .snapshots()
        .map((snap) => snap.docs
        .map((d) => Report.fromSnapshot(d))
        .toList());
  }
}
