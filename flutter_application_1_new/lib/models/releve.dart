class Releve {
  final int compteurId;
  final int nouvelIndex;

  Releve({required this.compteurId, required this.nouvelIndex});

  Map<String, dynamic> toJson() {
    return {
      'compteurId': compteurId,
      'nouvelIndex': nouvelIndex,
    };
  }
}
