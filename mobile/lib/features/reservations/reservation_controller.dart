import '../../core/storage/local_catalog_db.dart';
import 'package:flutter/foundation.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../auth/auth_controller.dart';
import '../catalog/catalog_api.dart';
import '../catalog/catalog_models.dart';
import 'reservation_api.dart';
import 'reservation_models.dart';

enum ReservationControllerStatus { idle, loading, saving, ready, error }

class ReservationController extends ChangeNotifier {
  ReservationController({
    ReservationApi? api,
    CatalogApi? catalogApi,
    AuthController? authController,
    LocalCatalogDb? localDb,
  }) : _api =
           api ??
           ReservationApi(
             client: ApiClient(
               tokenProvider: () => authController?.accessToken,
               onUnauthorized: authController?.handleUnauthorized,
             ),
           ),
       _catalogApi = catalogApi ?? CatalogApi(),
       _localDb = localDb ?? LocalCatalogDb();

  final ReservationApi _api;
  final CatalogApi _catalogApi;
  final LocalCatalogDb _localDb;

  ReservationControllerStatus status = ReservationControllerStatus.idle;
  List<Reservation> reservations = const [];
  List<Branch> branches = const [];
  List<PendingOfflineReservation> pendingReservations = const [];
  bool isSyncing = false;
  Reservation? selectedReservation;
  String? errorMessage;
  String? feedbackMessage;

  Future<void> load() async {
    status = ReservationControllerStatus.loading;
    errorMessage = null;
    feedbackMessage = null;
    notifyListeners();

    try {
      final results = await Future.wait([
        _api.getMine(),
        _catalogApi.getBranches(),
      ]);
      final reservationResult = results[0] as ReservationListResult;
      reservations = reservationResult.reservations;
      branches = results[1] as List<Branch>;
      try {
        pendingReservations = await _localDb.getPendingReservations();
      } catch (_) {
        pendingReservations = const [];
      }
      feedbackMessage = reservationResult.message;
      status = ReservationControllerStatus.ready;
    } catch (error) {
      status = ReservationControllerStatus.error;
      errorMessage = _messageFor(error);
    }
    notifyListeners();
  }

  Future<void> create({
    required String branchId,
    required DateTime visitDate,
    required List<ReservationDraftItem> items,
  }) {
    return _runSave(
      () => _api.create(branchId: branchId, visitDate: visitDate, items: items),
      onSuccess: (reservation) {
        reservations = [reservation, ...reservations];
      },
    );
  }

  Future<void> cancel(String reservationId) {
    return _runSave(
      () => _api.cancel(reservationId: reservationId),
      onSuccess: (reservation) {
        reservations = [
          for (final item in reservations)
            item.id == reservation.id ? reservation : item,
        ];
      },
    );
  }

  Future<void> decide(String reservationId, {required bool purchase}) {
    return _runSave(
      () => _api.decide(reservationId: reservationId, purchase: purchase),
      onSuccess: (reservation) {
        reservations = [
          for (final item in reservations)
            item.id == reservation.id ? reservation : item,
        ];
      },
    );
  }

  Future<void> transferToCart(String reservationId) async {
    status = ReservationControllerStatus.saving;
    errorMessage = null;
    feedbackMessage = null;
    notifyListeners();
    try {
      final result = await _api.transferToCart(reservationId: reservationId);
      feedbackMessage = result.message;
      status = ReservationControllerStatus.ready;
    } catch (error) {
      status = ReservationControllerStatus.error;
      errorMessage = _messageFor(error);
    }
    notifyListeners();
  }

  Future<void> loadDetail(String reservationId) async {
    status = ReservationControllerStatus.loading;
    errorMessage = null;
    notifyListeners();
    try {
      final result = await _api.getById(reservationId: reservationId);
      selectedReservation = result.reservation;
      feedbackMessage = result.message;
      status = ReservationControllerStatus.ready;
    } catch (error) {
      status = ReservationControllerStatus.error;
      errorMessage = _messageFor(error);
    }
    notifyListeners();
  }

  Future<void> _runSave(
    Future<ReservationResult> Function() operation, {
    required void Function(Reservation reservation) onSuccess,
  }) async {
    status = ReservationControllerStatus.saving;
    errorMessage = null;
    feedbackMessage = null;
    notifyListeners();
    try {
      final result = await operation();
      onSuccess(result.reservation);
      feedbackMessage = result.message;
      status = ReservationControllerStatus.ready;
    } catch (error) {
      status = ReservationControllerStatus.error;
      errorMessage = _messageFor(error);
    }
    notifyListeners();
  }


  Future<void> loadPendingOffline() async {
    try {
      pendingReservations = await _localDb.getPendingReservations();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> saveOfflineReservation({
    required String branchId,
    String? branchName,
    required DateTime visitDate,
    required List<ReservationDraftItem> items,
    double totalAmount = 0.0,
  }) async {
    status = ReservationControllerStatus.saving;
    errorMessage = null;
    feedbackMessage = null;
    notifyListeners();

    try {
      final now = DateTime.now();
      final clientReservationId = 'offline-${now.millisecondsSinceEpoch}-${items.length}';
      final offlineRes = PendingOfflineReservation(
        clientReservationId: clientReservationId,
        branchId: branchId,
        branchName: branchName,
        visitDate: visitDate,
        items: items,
        totalAmount: totalAmount,
        itemCount: items.fold(0, (sum, i) => sum + i.quantity),
        createdAt: now,
        syncStatus: 'PENDIENTE_SYNC',
      );

      await _localDb.savePendingReservation(offlineRes);
      pendingReservations = await _localDb.getPendingReservations();
      feedbackMessage = 'Reserva registrada localmente (Modo Desconectado). Se sincronizará al reanudar conexión.';
      status = ReservationControllerStatus.ready;
    } catch (e) {
      status = ReservationControllerStatus.error;
      errorMessage = 'Error guardando reserva offline: $e';
    }
    notifyListeners();
  }

  Future<int> syncAllPending() async {
    if (pendingReservations.isEmpty) return 0;
    isSyncing = true;
    errorMessage = null;
    notifyListeners();

    int syncedCount = 0;
    try {
      for (final item in List<PendingOfflineReservation>.from(pendingReservations)) {
        try {
          await _api.create(
            branchId: item.branchId,
            visitDate: item.visitDate,
            items: item.items,
            clientReservationId: item.clientReservationId,
          );
          await _localDb.deletePendingReservation(item.clientReservationId);
          syncedCount++;
        } catch (e) {
          debugPrint('Error sincronizando reserva ${item.clientReservationId}: $e');
        }
      }
      pendingReservations = await _localDb.getPendingReservations();
      final refreshed = await _api.getMine();
      reservations = refreshed.reservations;
      feedbackMessage = syncedCount > 0
          ? 'Se sincronizaron $syncedCount reservas offline exitosamente.'
          : 'No se pudieron sincronizar las reservas pendientes.';
    } catch (e) {
      errorMessage = 'Fallo durante la sincronización: $e';
    } finally {
      isSyncing = false;
      notifyListeners();
    }
    return syncedCount;
  }

  Future<void> deletePendingOffline(String clientReservationId) async {
    try {
      await _localDb.deletePendingReservation(clientReservationId);
      pendingReservations = await _localDb.getPendingReservations();
      feedbackMessage = 'Reserva offline descartada localmente.';
      notifyListeners();
    } catch (_) {}
  }

  static String _messageFor(Object error) {
    if (error is ApiException) return error.message;
    return 'No se pudo sincronizar las reservas.';
  }
}
