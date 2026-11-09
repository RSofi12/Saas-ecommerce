import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mobile/features/branches_map/routing_models.dart';
import 'package:mobile/features/branches_map/routing_service.dart';

void main() {
  group('RouteInfo Unit Tests', () {
    test('formatea distancias menores a 1000m en metros', () {
      const route = RouteInfo(
        points: [LatLng(-17.78, -63.18), LatLng(-17.785, -63.185)],
        distanceMeters: 650.0,
        durationSeconds: 180.0,
        profile: 'walking',
      );
      expect(route.formattedDistance, '650 m');
      expect(route.formattedDuration, '3 min');
    });

    test('formatea distancias en kilometros con un decimal', () {
      const route = RouteInfo(
        points: [LatLng(-17.78, -63.18), LatLng(-17.75, -63.19)],
        distanceMeters: 4500.0,
        durationSeconds: 720.0,
        profile: 'driving',
      );
      expect(route.formattedDistance, '4.5 km');
      expect(route.formattedDuration, '12 min');
    });

    test('formatea duracion en horas y minutos cuando excede 60 min', () {
      const route = RouteInfo(
        points: [],
        distanceMeters: 25000.0,
        durationSeconds: 4500.0, // 75 min -> 1 h 15 min
        profile: 'driving',
      );
      expect(route.formattedDuration, '1 h 15 min');
    });
  });

  group('RoutingService Fallback Geodesic Tests', () {
    test('calcula distancia haversine correcta entre dos puntos de Santa Cruz', () async {
      final service = RoutingService();
      // Plaza 24 de Septiembre a Equipetrol (aprox 2.4 - 2.8 km linea recta)
      const p1 = LatLng(-17.7833, -63.1821);
      const p2 = LatLng(-17.7658, -63.1952);

      final route = await service.calculateRoute(
        origin: p1,
        destination: p2,
        profile: 'driving',
      );

      expect(route.points.isNotEmpty, isTrue);
      expect(route.distanceMeters, greaterThan(1500));
      expect(route.distanceMeters, lessThan(4000));
      expect(route.durationSeconds, greaterThan(0));
    });
  });
}
