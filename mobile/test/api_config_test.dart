import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/api_config.dart';

void main() {
  test('development localhost URL is accepted', () {
    final config = ApiConfig(
      baseUrl: 'http://localhost:8000/',
      production: false,
    );

    expect(config.baseUrl, 'http://localhost:8000');
    expect(
      config.endpoint('/api/auth/login').toString(),
      'http://localhost:8000/api/auth/login',
    );
  });

  test('development emulator or LAN HTTP URL is accepted', () {
    final config = ApiConfig(
      baseUrl: 'http://10.0.2.2:8000',
      production: false,
    );

    expect(
      config.endpoint('api/auth/login').toString(),
      'http://10.0.2.2:8000/api/auth/login',
    );
  });

  test('production requires HTTPS', () {
    expect(
      () => ApiConfig(baseUrl: 'http://localhost:8000', production: true),
      throwsStateError,
    );
  });

  test('production accepts explicit HTTPS URL', () {
    final config = ApiConfig(
      baseUrl: 'https://backend.example.test/',
      production: true,
    );

    expect(config.baseUrl, 'https://backend.example.test');
  });

  test('missing URL fails instead of falling back', () {
    expect(() => ApiConfig(baseUrl: '', production: false), throwsStateError);
  });

  test('malformed URL fails safely', () {
    expect(
      () => ApiConfig(baseUrl: 'backend.example.test', production: true),
      throwsStateError,
    );
  });
}
