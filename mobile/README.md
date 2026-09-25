# mobile

A new Flutter project.

## API configuration

All backend requests use `API_BASE_URL`, supplied at build time with
`--dart-define`:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000
```

For a release build, provide an explicit HTTPS URL and enable production
validation:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://your-backend.example --dart-define=APP_PRODUCTION=true
```

The production URL is intentionally not included in this repository. Local
HTTP is permitted only for development/debug builds. Android release builds
disable cleartext traffic. API credentials and private keys remain backend-only.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
