// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:mobile/main.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('DMS login screen loads', (WidgetTester tester) async {
    await tester.pumpWidget(const DmsApp());

    expect(find.text('DMS Authenticator'), findsOneWidget);
    expect(find.text('Verify with biometrics'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(2));
  });
}
