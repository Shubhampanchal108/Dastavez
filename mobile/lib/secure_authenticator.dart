// lib/secure_authenticator.dart
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:asn1lib/asn1lib.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:pointycastle/export.dart';

class SecureAuthenticator {
  static const _privateKeyStorageKey = 'authenticator_private_key';
  static const _deviceIdStorageKey = 'authenticator_device_id';

  final FlutterSecureStorage storage = const FlutterSecureStorage();
  final LocalAuthentication biometric = LocalAuthentication();

  Future<bool> authenticateBiometric() async {
    final supported = await biometric.isDeviceSupported();
    final canCheck = await biometric.canCheckBiometrics;

    if (!supported || !canCheck) {
      throw Exception('Biometric authentication is not available');
    }

    return biometric.authenticate(
      localizedReason: 'Authenticate to access the OTP',
      options: const AuthenticationOptions(
        biometricOnly: true,
        stickyAuth: true,
        useErrorDialogs: true,
      ),
    );
  }

  Future<String> getDeviceId() async {
    final existing = await storage.read(key: _deviceIdStorageKey);

    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    final deviceId = 'flutter-${base64UrlEncode(bytes)}';

    await storage.write(key: _deviceIdStorageKey, value: deviceId);

    return deviceId;
  }

  Future<String> createKeyPair() async {
    final existingPrivateKey = await storage.read(key: _privateKeyStorageKey);

    if (existingPrivateKey != null && existingPrivateKey.isNotEmpty) {
      return existingPrivateKey;
    }

    final secureRandom = FortunaRandom();
    secureRandom.seed(
      KeyParameter(
        Uint8List.fromList(
          List<int>.generate(32, (_) => Random.secure().nextInt(256)),
        ),
      ),
    );

    final keyGenerator = ECKeyGenerator()
      ..init(
        ParametersWithRandom(
          ECKeyGeneratorParameters(ECCurve_secp256r1()),
          secureRandom,
        ),
      );

    final keyPair = keyGenerator.generateKeyPair();
    final privateKey = keyPair.privateKey as ECPrivateKey;

    final privateKeyBytes = _bigIntToBytes(privateKey.d!, 32);

    final encoded = base64Encode(privateKeyBytes);

    await storage.write(key: _privateKeyStorageKey, value: encoded);

    return encoded;
  }

  Future<String> getPublicKey() async {
    final privateKeyBase64 = await createKeyPair();
    final privateKeyBytes = base64Decode(privateKeyBase64);

    final privateKey = ECPrivateKey(
      _bytesToBigInt(privateKeyBytes),
      ECCurve_secp256r1(),
    );

    final publicPoint = privateKey.parameters!.G * privateKey.d!;
    final publicKey = ECPublicKey(publicPoint, ECCurve_secp256r1());

    final x = _bigIntToBytes(publicKey.Q!.x!.toBigInteger()!, 32);
    final y = _bigIntToBytes(publicKey.Q!.y!.toBigInteger()!, 32);

    final uncompressedPoint = Uint8List.fromList([0x04, ...x, ...y]);

    final algorithmIdentifier = ASN1Sequence()
      ..add(ASN1ObjectIdentifier.fromName('ecPublicKey'))
      ..add(ASN1ObjectIdentifier.fromName('secp256r1'));

    final subjectPublicKeyInfo = ASN1Sequence()
      ..add(algorithmIdentifier)
      ..add(ASN1BitString(uncompressedPoint));

    return base64Encode(subjectPublicKeyInfo.encodedBytes);
  }

  Future<String> signPayload(String payload) async {
    final authenticated = await authenticateBiometric();

    if (!authenticated) {
      throw Exception('Biometric authentication failed');
    }

    final privateKeyBase64 = await storage.read(key: _privateKeyStorageKey);

    if (privateKeyBase64 == null) {
      throw Exception('Authenticator key is not registered');
    }

    final privateKeyBytes = base64Decode(privateKeyBase64);

    final privateKey = ECPrivateKey(
      _bytesToBigInt(privateKeyBytes),
      ECCurve_secp256r1(),
    );

    final signer = ECDSASigner(SHA256Digest());

    final secureRandom = FortunaRandom();
    secureRandom.seed(
      KeyParameter(
        Uint8List.fromList(
          List<int>.generate(32, (_) => Random.secure().nextInt(256)),
        ),
      ),
    );

    signer.init(
      true,
      ParametersWithRandom(PrivateKeyParameter(privateKey), secureRandom),
    );

    final signature =
        signer.generateSignature(Uint8List.fromList(utf8.encode(payload)))
            as ECSignature;

    final r = _bigIntToBytes(signature.r, 32);
    final s = _bigIntToBytes(signature.s, 32);

    return base64Encode([...r, ...s]);
  }

  BigInt _bytesToBigInt(List<int> bytes) {
    var result = BigInt.zero;

    for (final byte in bytes) {
      result = (result << 8) | BigInt.from(byte);
    }

    return result;
  }

  List<int> _bigIntToBytes(BigInt value, int length) {
    final result = List<int>.filled(length, 0);
    var current = value;

    for (var index = length - 1; index >= 0; index--) {
      result[index] = (current & BigInt.from(255)).toInt();
      current >>= 8;
    }

    return result;
  }
}
