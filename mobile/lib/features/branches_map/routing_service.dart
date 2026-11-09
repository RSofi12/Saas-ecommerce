import 'dart:math' as math;
import 'package:dio/dio.dart';
import 'package:latlong2/latlong.dart';

import 'routing_models.dart';

class RoutingService {
  RoutingService({Dio? dio, this.orsApiKey}) : _dio = dio ?? Dio();

  final Dio _dio;
  final String? orsApiKey;

  Future<RouteInfo> calculateRoute({
    required LatLng origin,
    required LatLng destination,
    required String profile, // 'driving' | 'walking'
  }) async {
    // 1. Si se configuró API Key de OpenRouteService, intentar con ORS oficial
    if (orsApiKey != null && orsApiKey!.isNotEmpty) {
      try {
        final orsProfile = profile == 'walking' ? 'foot-walking' : 'driving-car';
        final response = await _dio.get(
          'https://api.openrouteservice.org/v2/directions/$orsProfile/geojson',
          queryParameters: {
            'api_key': orsApiKey,
            'start': '${origin.longitude},${origin.latitude}',
            'end': '${destination.longitude},${destination.latitude}',
          },
          options: Options(receiveTimeout: const Duration(seconds: 10)),
        );

        if (response.statusCode == 200 && response.data is Map) {
          final data = response.data as Map<String, dynamic>;
          final features = data['features'] as List?;
          if (features != null && features.isNotEmpty) {
            final firstFeature = features[0] as Map<String, dynamic>;
            final geometry = firstFeature['geometry'] as Map<String, dynamic>?;
            final properties = firstFeature['properties'] as Map<String, dynamic>?;
            final summary = properties?['summary'] as Map<String, dynamic>?;

            final coordinates = geometry?['coordinates'] as List?;
            if (coordinates != null && coordinates.isNotEmpty) {
              final points = <LatLng>[];
              for (final c in coordinates) {
                if (c is List && c.length >= 2) {
                  points.add(LatLng(
                    (c[1] as num).toDouble(),
                    (c[0] as num).toDouble(),
                  ));
                }
              }

              final distance = (summary?['distance'] as num?)?.toDouble() ?? 0.0;
              final duration = (summary?['duration'] as num?)?.toDouble() ?? 0.0;

              return RouteInfo(
                points: points,
                distanceMeters: distance,
                durationSeconds: duration,
                profile: profile,
              );
            }
          }
        }
      } catch (_) {
        // Fallback a motor público libre
      }
    }

    // 2. Motor público libre OSRM (Open Source Routing Machine sobre OpenStreetMap)
    try {
      final osrmProfile = profile == 'walking' ? 'walking' : 'driving';
      final url =
          'https://router.project-osrm.org/route/v1/$osrmProfile/'
          '${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}'
          '?overview=full&geometries=geojson';

      final response = await _dio.get(
        url,
        options: Options(
          receiveTimeout: const Duration(seconds: 8),
          sendTimeout: const Duration(seconds: 8),
          headers: {'User-Agent': 'FashionStoreApp/1.0 (mobile-maps)'},
        ),
      );

      if (response.statusCode == 200 && response.data is Map) {
        final data = response.data as Map<String, dynamic>;
        final routes = data['routes'] as List?;
        if (routes != null && routes.isNotEmpty) {
          final firstRoute = routes[0] as Map<String, dynamic>;
          final geometry = firstRoute['geometry'] as Map<String, dynamic>?;
          final coordinates = geometry?['coordinates'] as List?;

          if (coordinates != null && coordinates.isNotEmpty) {
            final points = <LatLng>[];
            for (final c in coordinates) {
              if (c is List && c.length >= 2) {
                points.add(LatLng(
                  (c[1] as num).toDouble(),
                  (c[0] as num).toDouble(),
                ));
              }
            }

            final distance = (firstRoute['distance'] as num?)?.toDouble() ?? 0.0;
            final duration = (firstRoute['duration'] as num?)?.toDouble() ?? 0.0;

            return RouteInfo(
              points: points,
              distanceMeters: distance,
              durationSeconds: duration,
              profile: profile,
            );
          }
        }
      }
    } catch (_) {
      // Fallback a aproximación euclidiana/geodésica
    }

    // 3. Fallback de alta resiliencia: Trayecto geodésico directo
    final directDistance = _calculateHaversineDistance(origin, destination);
    final speedKmH = profile == 'walking' ? 4.5 : 30.0;
    final estimatedSeconds = (directDistance / 1000.0) / speedKmH * 3600.0;

    return RouteInfo(
      points: [origin, destination],
      distanceMeters: directDistance,
      durationSeconds: estimatedSeconds,
      profile: profile,
    );
  }

  static double _calculateHaversineDistance(LatLng p1, LatLng p2) {
    const earthRadius = 6371000.0; // metros
    final dLat = _degToRad(p2.latitude - p1.latitude);
    final dLon = _degToRad(p2.longitude - p1.longitude);

    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_degToRad(p1.latitude)) *
            math.cos(_degToRad(p2.latitude)) *
            math.sin(dLon / 2) *
            math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return earthRadius * c;
  }

  static double _degToRad(double deg) => deg * (math.pi / 180.0);
}
