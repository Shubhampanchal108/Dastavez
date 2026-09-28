// lib/main.dart
import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
  String? revealedOtp;
  String? status;
  String? accessToken;

  bool loading = false;
  bool otpUnlocked = false;
  bool rememberMe = true;
  bool obscurePassword = true;

  Timer? pollTimer;
  Timer? otpCountdownTimer;
  int remainingSeconds = 300;

  @override
  void initState() {
    super.initState();
    _loadSavedCredentials();
  }

  Future<void> _loadSavedCredentials() async {
    try {
      final creds = await authenticator.getSavedCredentials();
      if (creds['email'] != null && creds['email']!.isNotEmpty) {
        if (mounted) {
          setState(() {
            emailController.text = creds['email']!;
            if (creds['password'] != null) {
              passwordController.text = creds['password']!;
            }
            rememberMe = true;
          });
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    pollTimer?.cancel();
    otpCountdownTimer?.cancel();
    emailController.dispose();
    passwordController.dispose();
    super.dispose();
  }

  Future<void> login() async {
    final email = emailController.text.trim();
    final password = passwordController.text;

    if (email.isEmpty || password.isEmpty) {
      showError('Please enter your Officer Email and Password first.');
      return;
    }

    setState(() {
      loading = true;
      status = null;
      challengeId = null;
      revealedOtp = null;
      otpUnlocked = false;
    });

    try {
      final authenticated = await authenticator.authenticateBiometric(
        reason: 'Verify your fingerprint biometric to access your login OTP',
      );
      if (!authenticated) {
        throw Exception('Biometric authentication failed. Fingerprint was not recognized.');
      }

      final response = await api.revealWebOtp(email, password);

      if (rememberMe) {
        await authenticator.saveCredentials(email, password);
      }

      challengeId = response['challenge_id'] as String?;
      revealedOtp = (response['otp'] ?? response['dev_otp']) as String?;
      status = 'OTP_REQUIRED';
      otpUnlocked = true;
      remainingSeconds = 300;

      otpCountdownTimer?.cancel();
      otpCountdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }
        if (remainingSeconds > 0) {
          setState(() {
            remainingSeconds--;
          });
        } else {
          timer.cancel();
          setState(() {
            otpUnlocked = false;
            revealedOtp = null;
          });
          showError('OTP expired. Start login again on the web app.');
        }
      });

      showSuccess('Biometric verified! 6-digit OTP unlocked.');
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

  void _copyOtpToClipboard() {
    if (revealedOtp != null) {
      Clipboard.setData(ClipboardData(text: revealedOtp!));
      showSuccess('OTP $revealedOtp copied to clipboard!');
    }
  }

  void _lockOtp() {
    otpCountdownTimer?.cancel();
    setState(() {
      otpUnlocked = false;
      revealedOtp = null;
      status = null;
    });
    showSuccess('OTP securely locked.');
  }

  void _showServerConfigDialog() {
    final serverController = TextEditingController(text: api.currentBaseUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0B192C),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E334F)),
        ),
        title: const Row(
          children: [
            Icon(Icons.dns_outlined, color: Color(0xFF246BFE), size: 20),
            SizedBox(width: 8),
            Text(
              'Server Endpoint',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Configure the FastAPI backend address (use your PC Wi-Fi IP if running on physical device):',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: serverController,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'http://10.0.2.2:8000',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFF101B31),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF334155)),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF246BFE)),
            onPressed: () {
              final newUrl = serverController.text.trim();
              if (newUrl.isNotEmpty) {
                api.updateBaseUrl(newUrl);
                Navigator.pop(ctx);
                showSuccess('Server updated to $newUrl');
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

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
      return 'Cannot reach DMS server at ${api.currentBaseUrl}. Connect phone and PC to the same Wi-Fi, or check server settings (top right).';
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
                          IconButton(
                            icon: const Icon(Icons.settings_outlined, color: muted, size: 20),
                            tooltip: 'Server Settings',
                            onPressed: _showServerConfigDialog,
                          ),
                        ],
                      ),
                      const SizedBox(height: 28),
                      const Text(
                        'BIOMETRIC AUTHENTICATOR',
                        style: TextStyle(
                          color: muted,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        otpRequired && otpUnlocked ? 'Biometric Verified' : 'Officer Verification',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        otpRequired && otpUnlocked
                            ? 'Your official 6-digit OTP is unlocked. Enter it on the web terminal.'
                            : 'Scan your fingerprint biometric to generate and reveal your web login OTP.',
                        style: const TextStyle(
                          color: muted,
                          fontSize: 13,
                          height: 1.45,
                        ),
                      ),
                      const SizedBox(height: 22),
                      _inputLabel('Official Email / Badge Identifier'),
                      const SizedBox(height: 8),
                      _inputField(
                        controller: emailController,
                        hint: 'investigator@dms.internal',
                        icon: Icons.mail_outline,
                        keyboardType: TextInputType.emailAddress,
                        background: field,
                      ),
                      const SizedBox(height: 16),
                      _inputLabel('Password'),
                      const SizedBox(height: 8),
                      _inputField(
                        controller: passwordController,
                        hint: 'Enter officer password',
                        icon: Icons.lock_outline,
                        obscureText: obscurePassword,
                        background: field,
                        suffixIcon: IconButton(
                          icon: Icon(
                            obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                            color: muted,
                            size: 18,
                          ),
                          onPressed: () {
                            setState(() {
                              obscurePassword = !obscurePassword;
                            });
                          },
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          SizedBox(
                            height: 24,
                            width: 24,
                            child: Checkbox(
                              value: rememberMe,
                              activeColor: blue,
                              checkColor: Colors.white,
                              side: const BorderSide(color: Color(0xFF334155)),
                              onChanged: (val) {
                                setState(() {
                                  rememberMe = val ?? false;
                                });
                              },
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            'Remember officer on this device',
                            style: TextStyle(color: muted, fontSize: 12),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
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
                            : const Icon(Icons.fingerprint, size: 22),
                        label: Text(
                          loading
                              ? 'Verifying Biometrics...'
                              : (otpUnlocked ? 'Re-scan Fingerprint' : 'Verify with Fingerprint'),
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
                            fontSize: 14,
                          ),
                        ),
                      ),
                      if (otpRequired && otpUnlocked && revealedOtp != null) ...[
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF0D2547), Color(0xFF0F3263)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFF2E6FEF), width: 1.5),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x332E6FEF),
                                blurRadius: 20,
                                offset: Offset(0, 8),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFF104A9E),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(
                                      Icons.fingerprint,
                                      color: Color(0xFF8DB4FF),
                                      size: 18,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  const Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'BIOMETRIC VERIFIED',
                                          style: TextStyle(
                                            color: Color(0xFF68D391),
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 1.2,
                                          ),
                                        ),
                                        Text(
                                          'OFFICIAL LOGIN OTP TOKEN',
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 12,
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 0.8,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.lock_outline, color: Color(0xFF94A3B8), size: 20),
                                    tooltip: 'Lock OTP',
                                    onPressed: _lockOtp,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              Container(
                                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF081528),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFF1E3A60)),
                                ),
                                child: Center(
                                  child: SelectableText(
                                    revealedOtp!,
                                    style: const TextStyle(
                                      color: Color(0xFFE2E8F0),
                                      fontSize: 36,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 9,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      'Valid for: ${remainingSeconds ~/ 60}:${(remainingSeconds % 60).toString().padLeft(2, '0')}',
                                      style: const TextStyle(
                                        color: Color(0xFFFBD38D),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ),
                                  TextButton.icon(
                                    onPressed: _copyOtpToClipboard,
                                    icon: const Icon(Icons.copy, size: 16, color: Color(0xFF72A2FF)),
                                    label: const Text(
                                      'Copy Code',
                                      style: TextStyle(
                                        color: Color(0xFF72A2FF),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Enter this 6-digit OTP into your DMS web terminal to complete login.',
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
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
                        'DMS Evidence Vault  •  Biometric Authenticator',
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
    Widget? suffixIcon,
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
        suffixIcon: suffixIcon,
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
