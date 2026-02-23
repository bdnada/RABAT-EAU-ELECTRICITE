// lib/firebase_options.dart
import 'package:firebase_core/firebase_core.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    return const FirebaseOptions(
      apiKey: "AIzaSyCV7cBZTnUcu7sFJlnEWMFJGMKtghqP_U8",  // Remplace par la clé depuis Firebase Console → Paramètres du projet → Clé API
      appId: "1:380243814252:android:c91a10e84b47948b32f549", // Copié depuis ID de l'application
      messagingSenderId: "380243814252",                     // Numéro du projet → Numéro du projet
      projectId: "flutterapp-b47f2",                        // ID du projet
    );
  }
}




