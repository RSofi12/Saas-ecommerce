import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../catalog/catalog_models.dart';
import 'branches_map_controller.dart';
import 'routing_models.dart';

class BranchesMapPage extends StatefulWidget {
  const BranchesMapPage({
    super.key,
    this.initialBranchId,
    this.controller,
  });

  final String? initialBranchId;
  final BranchesMapController? controller;

  @override
  State<BranchesMapPage> createState() => _BranchesMapPageState();
}

class _BranchesMapPageState extends State<BranchesMapPage> {
  late final BranchesMapController _controller;
  late final MapController _mapController;
  late final bool _ownsController;

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _ownsController = widget.controller == null;
    _controller = widget.controller ?? BranchesMapController();
    _controller.addListener(_onControllerChanged);
    _controller.init(initialBranchId: widget.initialBranchId);
  }

  @override
  void dispose() {
    _controller.removeListener(_onControllerChanged);
    if (_ownsController) {
      _controller.dispose();
    }
    _mapController.dispose();
    super.dispose();
  }

  void _onControllerChanged() {
    if (!mounted) return;
    setState(() {});
  }

  void _flyTo(LatLng position, {double zoom = 15.0}) {
    _mapController.move(position, zoom);
  }

  void _fitBounds(LatLng p1, LatLng p2) {
    final bounds = LatLngBounds(p1, p2);
    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: bounds,
        padding: const EdgeInsets.only(top: 100, bottom: 260, left: 40, right: 40),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final primaryGold = const Color(0xFFC5A880);
    final darkSurface = const Color(0xFF141721);
    final cardBg = isDark ? const Color(0xFF1E2230) : Colors.white;
    final borderColor = isDark ? const Color(0xFF2E3548) : const Color(0xFFE2E8F0);

    return Scaffold(
      backgroundColor: isDark ? darkSurface : const Color(0xFFF8FAFC),
      body: Stack(
        children: [
          // 1. Mapa interactivo OpenStreetMap
          Positioned.fill(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: _controller.userLocation,
                initialZoom: 13.5,
                minZoom: 4.0,
                maxZoom: 18.0,
              ),
              children: [
                // Capa de teselas OpenStreetMap
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.fashionstore.mobile',
                  tileBuilder: (context, widget, tile) {
                    if (!isDark) return widget;
                    // Tono sutilmente oscuro para modo noche
                    return ColorFiltered(
                      colorFilter: const ColorFilter.matrix([
                        0.25, 0, 0, 0, 0,
                        0, 0.25, 0, 0, 0,
                        0, 0, 0.28, 0, 0,
                        0, 0, 0, 1, 0,
                      ]),
                      child: widget,
                    );
                  },
                ),

                // Capa de polilínea de ruta (OpenRouteService / OSRM)
                if (_controller.currentRoute != null &&
                    _controller.currentRoute!.points.length >= 2)
                  PolylineLayer(
                    polylines: [
                      // Sombra suave para la ruta
                      Polyline(
                        points: _controller.currentRoute!.points,
                        strokeWidth: 6.0,
                        color: Colors.black.withOpacity(0.35),
                      ),
                      // Trazo principal dorado de boutique
                      Polyline(
                        points: _controller.currentRoute!.points,
                        strokeWidth: 4.5,
                        color: primaryGold,
                        borderColor: Colors.white.withOpacity(0.8),
                        borderStrokeWidth: 1.0,
                      ),
                    ],
                  ),

                // Capa de marcadores: Usuario y Sucursales
                MarkerLayer(
                  markers: [
                    // Marcador de ubicación del usuario
                    Marker(
                      point: _controller.userLocation,
                      width: 50,
                      height: 50,
                      child: _UserLocationMarker(
                        isSimulated: _controller.isUsingSimulatedLocation,
                      ),
                    ),

                    // Marcadores de las sucursales del tenant
                    for (final branch in _controller.branches)
                      if (branch.latitude != null && branch.longitude != null)
                        Marker(
                          point: LatLng(branch.latitude!, branch.longitude!),
                          width: 56,
                          height: 64,
                          child: GestureDetector(
                            onTap: () {
                              _controller.selectBranch(branch);
                              _flyTo(LatLng(branch.latitude!, branch.longitude!));
                            },
                            child: _BranchMarkerPin(
                              branch: branch,
                              isSelected: _controller.selectedBranch?.id == branch.id,
                              accentColor: primaryGold,
                            ),
                          ),
                        ),
                  ],
                ),
              ],
            ),
          ),

          // 2. Barra Superior Flotante: Atrás, Título y Selector de Modo de Viaje
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 16,
            right: 16,
            child: _TopNavigationBar(
              travelMode: _controller.travelMode,
              onModeChanged: (mode) {
                _controller.setTravelMode(mode);
                if (_controller.selectedBranch != null) {
                  final b = _controller.selectedBranch!;
                  _fitBounds(
                    _controller.userLocation,
                    LatLng(b.latitude!, b.longitude!),
                  );
                }
              },
              onBack: () => Navigator.of(context).pop(),
            ),
          ),

          // 3. Botones Flotantes de Acción en el Mapa (Mi Posición / Ver Todas)
          Positioned(
            right: 16,
            bottom: 250,
            child: Column(
              children: [
                _MapActionButton(
                  icon: Icons.my_location,
                  tooltip: 'Mi ubicación',
                  onTap: () => _flyTo(_controller.userLocation, zoom: 15.0),
                ),
                const SizedBox(height: 8),
                if (_controller.selectedBranch != null &&
                    _controller.selectedBranch!.latitude != null)
                  _MapActionButton(
                    icon: Icons.storefront_outlined,
                    tooltip: 'Centrar sucursal',
                    onTap: () {
                      final b = _controller.selectedBranch!;
                      _flyTo(LatLng(b.latitude!, b.longitude!), zoom: 16.0);
                    },
                  ),
              ],
            ),
          ),

          // 4. Panel Inferior Flotante de Detalle de Sucursal y Ruta
          Positioned(
            left: 16,
            right: 16,
            bottom: MediaQuery.of(context).padding.bottom + 16,
            child: _BoutiqueDetailCard(
              branch: _controller.selectedBranch,
              route: _controller.currentRoute,
              isLoadingRoute: _controller.isLoadingRoute,
              travelMode: _controller.travelMode,
              accentColor: primaryGold,
              cardBg: cardBg,
              borderColor: borderColor,
              onNavigate: () {
                if (_controller.selectedBranch != null &&
                    _controller.selectedBranch!.latitude != null) {
                  final b = _controller.selectedBranch!;
                  _fitBounds(
                    _controller.userLocation,
                    LatLng(b.latitude!, b.longitude!),
                  );
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// COMPONENTES MODULARES DE DISEÑO REFINADO
// ==========================================

class _TopNavigationBar extends StatelessWidget {
  const _TopNavigationBar({
    required this.travelMode,
    required this.onModeChanged,
    required this.onBack,
  });

  final String travelMode;
  final ValueChanged<String> onModeChanged;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF141721).withOpacity(0.92),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF2A2E3D)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.35),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.white, size: 20),
            onPressed: onBack,
            tooltip: 'Volver',
            style: IconButton.styleFrom(
              backgroundColor: const Color(0xFF222634),
              minimumSize: const Size(36, 36),
              padding: EdgeInsets.zero,
            ),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Nuestras Boutiques',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    letterSpacing: 0.2,
                  ),
                ),
                Text(
                  'OpenStreetMap · Rutas ORS',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          // Conmutador de modo de viaje: Auto / Caminata
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF1E2230),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF2E3548)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _ModeButton(
                  icon: Icons.directions_car,
                  label: 'Auto',
                  isSelected: travelMode == 'driving',
                  onTap: () => onModeChanged('driving'),
                ),
                _ModeButton(
                  icon: Icons.directions_walk,
                  label: 'Pie',
                  isSelected: travelMode == 'walking',
                  onTap: () => onModeChanged('walking'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFC5A880) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 15,
              color: isSelected ? const Color(0xFF12131A) : const Color(0xFF94A3B8),
            ),
            const SizedBox(width: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? const Color(0xFF12131A) : const Color(0xFF94A3B8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserLocationMarker extends StatelessWidget {
  const _UserLocationMarker({required this.isSimulated});

  final bool isSimulated;

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        // Halo de pulso
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF3B82F6).withOpacity(0.2),
          ),
        ),
        // Círculo exterior blanco
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.25),
                blurRadius: 6,
                offset: const Offset(0, 2),
              ),
            ],
          ),
        ),
        // Punto central azul
        Container(
          width: 14,
          height: 14,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFF2563EB),
          ),
        ),
      ],
    );
  }
}

class _BranchMarkerPin extends StatelessWidget {
  const _BranchMarkerPin({
    required this.branch,
    required this.isSelected,
    required this.accentColor,
  });

  final Branch branch;
  final bool isSelected;
  final Color accentColor;

  @override
  Widget build(BuildContext context) {
    final bgColor = isSelected ? accentColor : const Color(0xFF1E2230);
    final iconColor = isSelected ? const Color(0xFF141721) : accentColor;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          width: isSelected ? 46 : 38,
          height: isSelected ? 46 : 38,
          decoration: BoxDecoration(
            color: bgColor,
            shape: BoxShape.circle,
            border: Border.all(
              color: isSelected ? Colors.white : const Color(0xFF3A4156),
              width: isSelected ? 2.5 : 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: isSelected ? accentColor.withOpacity(0.45) : Colors.black.withOpacity(0.3),
                blurRadius: isSelected ? 12 : 6,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Icon(
            Icons.storefront_rounded,
            color: iconColor,
            size: isSelected ? 24 : 18,
          ),
        ),
        // Punta del pin
        CustomPaint(
          size: const Size(10, 6),
          painter: _PinTipPainter(color: isSelected ? accentColor : const Color(0xFF1E2230)),
        ),
      ],
    );
  }
}

class _PinTipPainter extends CustomPainter {
  _PinTipPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _PinTipPainter oldDelegate) => oldDelegate.color != color;
}

class _MapActionButton extends StatelessWidget {
  const _MapActionButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: const Color(0xFF1E2230),
      borderRadius: BorderRadius.circular(14),
      elevation: 4,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF2E3548)),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}

class _BoutiqueDetailCard extends StatelessWidget {
  const _BoutiqueDetailCard({
    required this.branch,
    required this.route,
    required this.isLoadingRoute,
    required this.travelMode,
    required this.accentColor,
    required this.cardBg,
    required this.borderColor,
    required this.onNavigate,
  });

  final Branch? branch;
  final RouteInfo? route;
  final bool isLoadingRoute;
  final String travelMode;
  final Color accentColor;
  final Color cardBg;
  final Color borderColor;
  final VoidCallback onNavigate;

  @override
  Widget build(BuildContext context) {
    if (branch == null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: borderColor),
        ),
        child: const Row(
          children: [
            CircularProgressIndicator(strokeWidth: 2),
            SizedBox(width: 14),
            Text('Localizando sucursales...'),
          ],
        ),
      );
    }

    final modeLabel = travelMode == 'walking' ? 'a pie' : 'en auto';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: borderColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.25),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Fila 1: Nombre de la sucursal y Badge
          Row(
            children: [
              Expanded(
                child: Text(
                  branch!.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (branch!.isDefault)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: accentColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: accentColor.withOpacity(0.4)),
                  ),
                  child: Text(
                    'Principal',
                    style: TextStyle(
                      color: accentColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 6),

          // Fila 2: Dirección física
          if (branch!.address != null && branch!.address!.isNotEmpty)
            Row(
              children: [
                Icon(Icons.location_on_outlined, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    branch!.address!,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),

          const SizedBox(height: 4),

          // Fila 3: Horario y Teléfono
          Row(
            children: [
              if (branch!.openingHours != null && branch!.openingHours!.isNotEmpty) ...[
                Icon(Icons.schedule_outlined, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(
                  branch!.openingHours!,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                ),
                const SizedBox(width: 14),
              ],
              if (branch!.phone != null && branch!.phone!.isNotEmpty) ...[
                Icon(Icons.phone_outlined, size: 14, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(
                  branch!.phone!,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade400),
                ),
              ],
            ],
          ),

          const SizedBox(height: 14),

          // Fila 4: Banner de Trayecto y Estimación ORS
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFF141721),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF2A2E3D)),
            ),
            child: Row(
              children: [
                if (isLoadingRoute) ...[
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Calculando ruta óptima...',
                    style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                ] else if (route != null) ...[
                  Icon(
                    travelMode == 'walking' ? Icons.directions_walk : Icons.directions_car,
                    size: 18,
                    color: accentColor,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '${route!.formattedDistance} · ${route!.formattedDuration} $modeLabel',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                  const Spacer(),
                  GestureDetector(
                    onTap: onNavigate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: accentColor,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.alt_route, size: 13, color: Color(0xFF12131A)),
                          SizedBox(width: 4),
                          Text(
                            'Trazar',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF12131A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ] else ...[
                  const Icon(Icons.route, size: 16, color: Color(0xFF94A3B8)),
                  const SizedBox(width: 8),
                  const Text(
                    'Ruta disponible hacia esta boutique',
                    style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
