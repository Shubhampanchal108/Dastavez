// lib/main.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';

import 'auth_api.dart';
import 'secure_authenticator.dart';

void main() {
  runApp(const DmsApp());
}

class DmsApp extends StatelessWidget {
  const DmsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'DMS Authenticator',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const LoginPage(),
    );
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();

  final api = AuthApi();
  final authenticator = SecureAuthenticator();

  String? challengeId;
  String? devOtp;
  String? status;
  String? accessToken;

  bool loading = false;
  bool otpUnlocked = false;
  Timer? pollTimer;

  @override
  void dispose() {
    pollTimer?.cancel();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> login() async {
    setState(() {
      loading = true;
      status = null;
      challengeId = null;
      devOtp = null;
      otpUnlocked = false;
    });

    try {
      final authenticated = await authenticator.authenticateBiometric();
      if (!authenticated) {
        throw Exception('Biometric authentication failed');
      }

      final response = await api.revealWebOtp(
        emailController.text.trim(),
        passwordController.text,
      );

      challengeId = response['challenge_id'] as String;
      devOtp = response['dev_otp'] as String?;
      status = 'OTP_REQUIRED';
      otpUnlocked = true;
      showSuccess('Biometric approved. Web OTP is now shown.');
    } catch (error) {
      showError(_friendlyError(error));
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  // Replace approveAuthenticatorLogin() in main.dart with this version.
  Future<void> approveAuthenticatorLogin() async {
    if (challengeId == null) {
      throw Exception('No authenticator challenge found');
    }

    final deviceId = await authenticator.getDeviceId();

    final statusResponse = await api.getChallengeStatus(
      challengeId!,
      token: accessToken,
    );
    final expiresAt = statusResponse['expires_at'] as String;

    final payload = jsonEncode({
      'challenge_id': challengeId,
      'device_id': deviceId,
      'expires_at': expiresAt,
      'purpose': 'AUTHENTICATOR_LOGIN',
      'status': 'PENDING',
    });

    final signature = await authenticator.signPayload(payload);

    await api.approveAuthenticator(
      challengeId: challengeId!,
      deviceId: deviceId,
      payload: payload,
      signature: signature,
    );

    final completed = await api.completeAuthenticator(challengeId!);

    accessToken = completed['access_token'] as String;
    status = 'LOGIN_SUCCESS';

    showSuccess('Login approved with biometric');
  }

  Future<void> registerAuthenticator() async {
    if (accessToken == null) {
      showError('Login first before registering this device');
      return;
    }

    try {
      final authenticated = await authenticator.authenticateBiometric();

      if (!authenticated) {
        throw Exception('Biometric authentication failed');
      }

      final deviceId = await authenticator.getDeviceId();
      final publicKey = await authenticator.getPublicKey();

      await api.registerDevice(
        token: accessToken!,
        deviceId: deviceId,
        publicKey: publicKey,
      );

      showSuccess('Authenticator registered');
    } catch (error) {
      showError(_friendlyError(error));
    }
  }

  Future<void> approvePendingWebLogin() async {
    setState(() {
      loading = true;
    });

    try {
      final deviceId = await authenticator.getDeviceId();
      final pending = await api.getPendingChallenges(
        deviceId,
        token: accessToken,
      );
      if (pending.isEmpty) {
        throw Exception('No pending web login found');
      }

      final pendingChallengeId = pending.first['challenge_id'] as String;
      final challenge = await api.getChallengeStatus(
        pendingChallengeId,
        token: accessToken,
      );
      final expiresAt = challenge['expires_at'] as String;
      final payload = jsonEncode({
        'challenge_id': pendingChallengeId,
        'device_id': deviceId,
        'expires_at': expiresAt,
        'purpose': 'AUTHENTICATOR_LOGIN',
        'status': 'PENDING',
      });
      final signature = await authenticator.signPayload(payload);

      await api.approveAuthenticator(
        challengeId: pendingChallengeId,
        deviceId: deviceId,
        payload: payload,
        signature: signature,
      );
      showSuccess('Web login approved');
    } catch (error) {
      showError(_friendlyError(error));
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  void showError(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF10233B),
        elevation: 12,
        margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFF2D4665)),
        ),
        content: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFF5B4218),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.info_outline,
                color: Color(0xFFFFC857),
                size: 19,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void showSuccess(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF102B55),
        elevation: 12,
        margin: const EdgeInsets.fromLTRB(20, 0, 20, 20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFF2E6FEF)),
        ),
        content: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFF174A94),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.check_circle_outline,
                color: Color(0xFF8DB4FF),
                size: 19,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _friendlyError(Object error) {
    final message = error.toString().replaceFirst('Exception: ', '');
    if (message.contains('ClientException') || message.contains('Connection')) {
      return 'Cannot reach DMS server at ${AuthApi.baseUrl}. Connect the phone and computer to the same Wi-Fi network.';
    }
    return message;
  }

  @override
  Widget build(BuildContext context) {
    final otpRequired = status == 'OTP_REQUIRED';
    final loggedIn = status == 'LOGIN_SUCCESS';
    const background = Color(0xFF07111E);
    const panel = Color(0xFF0B192C);
    const field = Color(0xFF101B31);
    const blue = Color(0xFF246BFE);
    const muted = Color(0xFF94A3B8);

    return Scaffold(
      backgroundColor: background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: panel,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFF1E334F)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x66000000),
                      blurRadius: 30,
                      offset: Offset(0, 16),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: blue,
                              borderRadius: BorderRadius.circular(14),
                            ),
                            child: const Icon(
                              Icons.shield_outlined,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 14),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'DMS Authenticator',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 21,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                SizedBox(height: 3),
                                Text(
                                  'Institutional Cryptographic Terminal',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: muted, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),
                      const Text(
                        'MOBILE AUTHENTICATOR',
                        style: TextStyle(
                          color: muted,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        otpRequired ? 'Web login approved' : 'Secure sign-in',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        otpRequired
                            ? 'Your one-time code is ready. Enter it on the DMS web terminal.'
                            : 'Use your DMS credentials and biometric verification to unlock a web login code.',
                        style: const TextStyle(
                          color: muted,
                          fontSize: 13,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 24),
                      _inputLabel('Official Email / Badge Identifier'),
                      const SizedBox(height: 8),
                      _inputField(
                        controller: emailController,
                        hint: 'investigator@dms.internal',
                        icon: Icons.mail_outline,
                        keyboardType: TextInputType.emailAddress,
                        background: field,
                      ),
                      const SizedBox(height: 18),
                      _inputLabel('Password'),
                      const SizedBox(height: 8),
                      _inputField(
                        controller: passwordController,
                        hint: 'Enter password',
                        icon: Icons.lock_outline,
                        obscureText: true,
                        background: field,
                      ),
                      const SizedBox(height: 24),
                      FilledButton.icon(
                        onPressed: loading ? null : login,
                        icon: loading
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.fingerprint),
                        label: Text(
                          loading ? 'Verifying...' : 'Verify with biometrics',
                        ),
                        style: FilledButton.styleFrom(
                          backgroundColor: blue,
                          foregroundColor: Colors.white,
                          minimumSize: const Size.fromHeight(52),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          textStyle: const TextStyle(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      if (otpRequired && otpUnlocked && devOtp != null) ...[
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            color: const Color(0xFF102B55),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFF2E6FEF)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Row(
                                children: [
                                  Icon(
                                    Icons.verified_user_outlined,
                                    color: Color(0xFF72A2FF),
                                    size: 18,
                                  ),
                                  SizedBox(width: 8),
                                  Text(
                                    'WEB LOGIN OTP',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.1,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Center(
                                child: SelectableText(
                                  devOtp!,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 34,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 8,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 10),
                              const Text(
                                'Read-only code. Enter it on the DMS web terminal.',
                                style: TextStyle(color: muted, fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (loggedIn) ...[
                        const SizedBox(height: 18),
                        OutlinedButton.icon(
                          onPressed: registerAuthenticator,
                          icon: const Icon(Icons.phonelink_lock_outlined),
                          label: const Text('Register this device'),
                        ),
                        OutlinedButton.icon(
                          onPressed: loading ? null : approvePendingWebLogin,
                          icon: const Icon(Icons.login_outlined),
                          label: const Text('Approve web login'),
                        ),
                      ],
                      const SizedBox(height: 28),
                      const Divider(color: Color(0xFF1E334F)),
                      const SizedBox(height: 12),
                      const Text(
                        'DMS Evidence Vault  •  Authenticator 2026.4',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _inputLabel(String label) {
    return Text(
      label,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 12,
        fontWeight: FontWeight.w700,
      ),
    );
  }

  Widget _inputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    required Color background,
    TextInputType? keyboardType,
    bool obscureText = false,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.white, fontSize: 13),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 13),
        prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 20),
        filled: true,
        fillColor: background,
        contentPadding: const EdgeInsets.symmetric(
          vertical: 16,
          horizontal: 14,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF246BFE), width: 1.5),
        ),
      ),
    );
  }
}
