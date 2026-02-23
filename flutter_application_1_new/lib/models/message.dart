class Message {
  final int id;
  final String contenu;
  final String sender;
  final bool lu;
  final DateTime createdAt;

  Message({
    required this.id,
    required this.contenu,
    required this.sender,
    required this.lu,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json) => Message(
        id: json['id'],
        contenu: json['contenu'],
        sender: json['sender'],
        lu: json['lu'],
        createdAt: DateTime.parse(json['createdAt']),
      );
}
