class ApiConfig {
  ApiConfig({required String baseUrl, required this.production})
    : _baseUrl = _normalize(baseUrl, production);

  factory ApiConfig.fromEnvironment() {
    return ApiConfig(
      baseUrl: const String.fromEnvironment('API_BASE_URL'),
      production: const bool.fromEnvironment('APP_PRODUCTION'),
    );
  }

  String _baseUrl;
  String get baseUrl => _baseUrl;
  set baseUrl(String url) {
    _baseUrl = _normalize(url, production);
  }

  final bool production;

  Uri endpoint(String path) {
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    return Uri.parse('$_baseUrl$normalizedPath');
  }

  static String _normalize(String value, bool production) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) {
      if (!production) {
        return 'http://10.0.2.2:8000';
      }
      throw StateError(
        'API_BASE_URL is required. Pass the backend URL with --dart-define.',
      );
    }

    final uri = Uri.tryParse(trimmed);
    if (uri == null ||
        uri.host.isEmpty ||
        !{'http', 'https'}.contains(uri.scheme)) {
      throw StateError('API_BASE_URL must be a valid HTTP(S) URL.');
    }
    if (production && uri.scheme != 'https') {
      throw StateError('Production API_BASE_URL must use HTTPS.');
    }

    final path = uri.path.replaceFirst(RegExp(r'/+$'), '');
    return uri.replace(path: path).toString().replaceFirst(RegExp(r'/$'), '');
  }
}
