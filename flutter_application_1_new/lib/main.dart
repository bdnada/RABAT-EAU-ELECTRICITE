import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'screens/splash_screen.dart'; // seul import nécessaire ici

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  runApp(const ApplicationReleve());
}

class ApplicationReleve extends StatelessWidget {
  const ApplicationReleve({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "Application Relève",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(primarySwatch: Colors.blue),
      // Démarrage sur le splash screen
      home: const SplashScreen(),
    );
  }
}
