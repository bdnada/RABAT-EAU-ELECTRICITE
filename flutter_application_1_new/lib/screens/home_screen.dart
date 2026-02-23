import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'compteurs_screen.dart';



class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService apiService = ApiService();
  List<dynamic> adresses = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    fetchTournee();
  }

  void fetchTournee() async {
    try {
      final data = await apiService.getTournee();
      setState(() {
        adresses = data;
        loading = false;
      });
    } catch (e) {
      setState(() => loading = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Erreur : ${e.toString()}")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Accueil"),
        actions: [
          IconButton(
            icon: Icon(Icons.logout),
            onPressed: () async {
              await apiService.logout();
              Navigator.pop(context);
            },
          )
        ],
      ),
      body: loading
          ? Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: adresses.length,
              itemBuilder: (context, index) {
                final adresse = adresses[index];
                return ListTile(
                  title: Text(adresse['nom'] ?? 'Adresse'),
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => CompteursScreen(adresseId: adresse['id'], adresseNom: adresse['nom'])),
                    );
                  },
                );
              },
            ),
    );
  }
}
