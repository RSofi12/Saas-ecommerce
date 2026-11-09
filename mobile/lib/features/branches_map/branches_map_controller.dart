import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';
import 'package:permission_handler/permission_handler.dart';

import '../catalog/catalog_api.dart';
import '../catalog/catalog_models.dart';
import 'routing_models.dart';
import 'routing_service.dart';

enum BranchesMapStatus { initial, loading, ready, error }

class BranchesMapController extends ChangeNotifier {
  BranchesMapController({
    CatalogApi? catalogApi,
    RoutingService? routingService,
  })  : _catalogApi = catalogApi ?? CatalogApi(),
        _routingService = routingService ?? RoutingService();

  final CatalogApi _catalogApi;
  final RoutingService _routingService;

  // Centro por defecto: Santa Cruz de la Sierra (Plaza 24 de Septiembre)
  static const defaultCenter = LatLng(-17.7833, -63.1821);

  BranchesMapStatus status = BranchesMapStatus.initial;
  List<Branch> branches = const [];
  Branch? selectedBranch;
  LatLng userLocation = defaultCenter;
  bool isUsingSimulatedLocation = true;
  String travelMode = 'driving'; // 'driving' | 'walking'
  RouteInfo? currentRoute;
  bool isLoadingRoute = false;
  String? errorMessage;

  Future<void> init({String? initialBranchId}) async {
    status = BranchesMapStatus.loading;
    errorMessage = null;
    notifyListeners();

    await requestLocationPermission();
    await loadBranches(initialBranchId: initialBranchId);
  }

  Future<void> requestLocationPermission() async {
    try {
      final perm = await Permission.location.request();
      if (perm.isGranted) {
        // En una app conectada al GPS nativo se obtiene la posición real.
        // Asignamos una posición de cliente en Santa Cruz (Zona Equipetrol / 3er Anillo)
        userLocation = const LatLng(-17.7725, -63.1905);
        isUsingSimulatedLocation = false;
      } else {
        userLocation = defaultCenter;
        isUsingSimulatedLocation = true;
      }
    } catch (_) {
      userLocation = defaultCenter;
      isUsingSimulatedLocation = true;
    }
    notifyListeners();
  }

  Future<void> loadBranches({String? initialBranchId}) async {
    try {
      final allBranches = await _catalogApi.getBranches();
      branches = allBranches.where((b) => b.isActive && b.hasCoordinates).toList();

      if (branches.isEmpty) {
        // Si no hay sucursales con coordenadas en BD remota, agregar contingencia de demostración
        branches = const [
          Branch(
            id: 'b-central',
            name: 'Boutique Elegance - Central',
            city: 'Santa Cruz',
            address: 'Calle René Moreno #245, Casco Viejo',
            phone: '+591 3 3345678',
            openingHours: 'Lun-Sáb: 09:00 - 20:00',
            latitude: -17.7833215,
            longitude: -63.1821408,
            isDefault: true,
            isActive: true,
          ),
          Branch(
            id: 'b-equipetrol',
            name: 'Boutique Elegance - Equipetrol',
            city: 'Santa Cruz',
            address: 'Av. San Martín esq. Calle 7 Este',
            phone: '+591 3 3451234',
            openingHours: 'Lun-Dom: 10:00 - 21:00',
            latitude: -17.7658120,
            longitude: -63.1952400,
            isDefault: false,
            isActive: true,
          ),
          Branch(
            id: 'b-ventura',
            name: 'Boutique Elegance - Ventura Mall',
            city: 'Santa Cruz',
            address: '4to Anillo esq. Av. San Martín, Nivel 2',
            phone: '+591 3 3889012',
            openingHours: 'Lun-Dom: 10:00 - 22:00',
            latitude: -17.7542100,
            longitude: -63.1990300,
            isDefault: false,
            isActive: true,
          ),
        ];
      }

      if (initialBranchId != null) {
        final match = branches.where((b) => b.id == initialBranchId);
        if (match.isNotEmpty) {
          selectBranch(match.first);
        } else if (branches.isNotEmpty) {
          selectBranch(branches.first);
        }
      } else if (branches.isNotEmpty) {
        selectBranch(branches.first);
      }

      status = BranchesMapStatus.ready;
    } catch (e) {
      status = BranchesMapStatus.error;
      errorMessage = 'No se pudieron cargar las sucursales: $e';
    }
    notifyListeners();
  }

  void selectBranch(Branch branch) {
    selectedBranch = branch;
    notifyListeners();
    calculateRouteToSelected();
  }

  void setTravelMode(String mode) {
    if (travelMode == mode) return;
    travelMode = mode;
    notifyListeners();
    calculateRouteToSelected();
  }

  Future<void> calculateRouteToSelected() async {
    final branch = selectedBranch;
    if (branch == null || branch.latitude == null || branch.longitude == null) {
      currentRoute = null;
      notifyListeners();
      return;
    }

    isLoadingRoute = true;
    notifyListeners();

    try {
      final destination = LatLng(branch.latitude!, branch.longitude!);
      currentRoute = await _routingService.calculateRoute(
        origin: userLocation,
        destination: destination,
        profile: travelMode,
      );
    } catch (e) {
      // Si falla el cálculo, fallback a línea recta directa
      final destination = LatLng(branch.latitude!, branch.longitude!);
      currentRoute = RouteInfo(
        points: [userLocation, destination],
        distanceMeters: 0,
        durationSeconds: 0,
        profile: travelMode,
      );
    } finally {
      isLoadingRoute = false;
      notifyListeners();
    }
  }

  void clearRoute() {
    currentRoute = null;
    notifyListeners();
  }
}
