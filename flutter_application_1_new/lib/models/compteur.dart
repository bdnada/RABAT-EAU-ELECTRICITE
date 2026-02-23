class Compteur {
  final int id;
  final String type; // Eau / Electricité
  final int ancienIndex;

  Compteur({required this.id, required this.type, required this.ancienIndex});

  factory Compteur.fromJson(Map<String, dynamic> json) {
    return Compteur(
      id: json['id'],
      type: json['type'] ?? '',
      ancienIndex: json['ancienIndex'] ?? 0,
    );
  }
}
