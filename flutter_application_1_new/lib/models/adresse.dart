class Adresse {
  final int id;
  final String adresseComplete;
  final String quartier;
  final String ville;
  final double latitude;        
  final double longitude;       
  int nbCompteursRestants; // On va le calculer en local

  Adresse({
    required this.id,
    required this.adresseComplete,
    required this.quartier,
    required this.ville,
    this.latitude = 0.0,
    this.longitude = 0.0,
    this.nbCompteursRestants = 0,
  });

  factory Adresse.fromJson(Map<String, dynamic> json) {
    return Adresse(
      id: json['id'],
      adresseComplete: json['adresseComplete'] ?? '',
      quartier: json['quartier'] ?? '',
      ville: json['ville'] ?? '',
      latitude: double.tryParse(json['latitude']?.toString() ?? '0') ?? 0.0,
      longitude: double.tryParse(json['longitude']?.toString() ?? '0') ?? 0.0,
      nbCompteursRestants: 0, // On initialise à 0, tu peux le calculer après si besoin
    );
  }
}
