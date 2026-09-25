// lib/auth_api.dart
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'api_config.dart';

class AuthApi {
  AuthApi({ApiConfig? config})
    : _config = config ?? ApiConfig.fromEnvironment();

  static String get baseUrl => ApiConfig.fromEnvironment().baseUrl;

  final ApiConfig _config;

  Uri _authEndpoint(String path) => _config.endpoint('/api/auth/$path');

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      _authEndpoint('login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    return _decode(response);
  }

  Future<Map<String, dynamic>> revealWebOtp(
    String email,
    String password,
  ) async {
    final response = await http.post(
      _authEndpoint('mobile/reveal-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );

    return _decode(response);
  }

  Future<Map<String, dynamic>> verifyOtp(String challengeId, String otp) async {
    final response = await http.post(
      _authEndpoint('verify-otp'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'challenge_id': challengeId, 'otp': otp}),
    );

    return _decode(response);
  }

  Future<Map<String, dynamic>> approveAuthenticator({
    required String challengeId,
    required String deviceId,
    required String payload,
    required String signature,
  }) async {
    final response = await http.post(
      _authEndpoint('authenticator/approve'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'challenge_id': challengeId,
        'device_id': deviceId,
        'payload': payload,
        'signature': signature,
      }),
    );

    return _decode(response);
  }

  Future<Map<String, dynamic>> completeAuthenticator(String challengeId) async {
    final response = await http.post(
      _authEndpoint('login/complete'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'challenge_id': challengeId}),
    );

    return _decode(response);
  }

  // Add this method to auth_api.dart.
  Future<Map<String, dynamic>> getChallengeStatus(
    String challengeId, {
    String? token,
  }) async {
    final response = await http.get(
      _authEndpoint('authenticator-challenge/$challengeId'),
      headers: token == null ? null : {'Authorization': 'Bearer $token'},
    );

    return _decode(response);
  }

  Future<List<Map<String, dynamic>>> getPendingChallenges(
    String deviceId, {
    String? token,
  }) async {
    final response = await http.get(
      _authEndpoint(
        'authenticator-challenges/device/${Uri.encodeComponent(deviceId)}',
      ),
      headers: token == null ? null : {'Authorization': 'Bearer $token'},
    );
    final decoded = _decode(response);
    return (decoded as List<dynamic>).cast<Map<String, dynamic>>();
  }

  Future<Map<String, dynamic>> registerDevice({
    required String token,
    required String deviceId,
    required String publicKey,
  }) async {
    final response = await http.post(
      _authEndpoint('authenticator/register'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'device_id': deviceId,
        'device_name': 'Flutter Android Authenticator',
        'public_key': publicKey,
      }),
    );

    return _decode(response);
  }

  dynamic _decode(http.Response response) {
    final body = response.body.isEmpty
        ? <String, dynamic>{}
        : jsonDecode(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(body['detail'] ?? 'Authentication failed');
    }

    return body;
  }
}
