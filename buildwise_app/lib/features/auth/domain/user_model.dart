import 'package:equatable/equatable.dart';

class UserModel extends Equatable {
  final String id;
  final String email;
  final String fullName;
  final String? phoneNumber;
  final String? companyName;
  final String? profilePictureUrl;

  const UserModel({
    required this.id,
    required this.email,
    required this.fullName,
    this.phoneNumber,
    this.companyName,
    this.profilePictureUrl,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      fullName: json['full_name'] as String,
      phoneNumber: json['phone_number'] as String?,
      companyName: json['company_name'] as String?,
      profilePictureUrl: json['profile_picture_url'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'full_name': fullName,
      'phone_number': phoneNumber,
      'company_name': companyName,
      'profile_picture_url': profilePictureUrl,
    };
  }

  @override
  List<Object?> get props => [id, email, fullName, phoneNumber, companyName, profilePictureUrl];
}
