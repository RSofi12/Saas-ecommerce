import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../core/config/app_config.dart';

class VirtualTryOnPage extends StatefulWidget {
  const VirtualTryOnPage({
    super.key,
    required this.productName,
    required this.garmentImageUrl,
  });

  final String productName;
  final String garmentImageUrl;

  @override
  State<VirtualTryOnPage> createState() => _VirtualTryOnPageState();
}

class _VirtualTryOnPageState extends State<VirtualTryOnPage> {
  WebViewController? _controller;
  bool _isLoading = true;
  bool _configurationSent = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    unawaited(_initializeWebView());
  }

  Future<void> _initializeWebView() async {
    final frontendUrl = AppConfig.frontendUrl.trim();
    final apiKey = AppConfig.decartApiKey.trim();
    final garmentImageUrl = widget.garmentImageUrl.trim();

    if (frontendUrl.isEmpty) {
      _errorMessage = 'La URL del frontend no está configurada.';
      return;
    }
    if (apiKey.isEmpty) {
      _errorMessage = 'La clave de API de Decart no está configurada.';
      return;
    }
    if (garmentImageUrl.isEmpty) {
      _errorMessage = 'Esta prenda no tiene una imagen disponible para el probador virtual.';
      return;
    }

    final uri = Uri.tryParse(AppConfig.decartTryOnUrl);
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      _errorMessage = 'La URL del frontend no es válida.';
      return;
    }

    PermissionStatus cameraStatus;
    try {
      cameraStatus = await Permission.camera.request();
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'No se pudo solicitar acceso a la cámara para el probador virtual.';
      });
      return;
    }

    if (!mounted) return;
    if (!cameraStatus.isGranted) {
      setState(() {
        _isLoading = false;
        _errorMessage = cameraStatus.isPermanentlyDenied
            ? 'El acceso a la cámara está desactivado. Actívalo en Ajustes para usar el probador virtual.'
            : 'Se requiere acceso a la cámara para usar el probador virtual.';
      });
      return;
    }

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (!mounted) return;
            setState(() {
              _configurationSent = false;
              _isLoading = true;
              _errorMessage = null;
            });
          },
          onPageFinished: (_) => _sendConfiguration(),
          onWebResourceError: (_) {
            if (!mounted) return;
            setState(() {
              _isLoading = false;
              _errorMessage = 'No se pudo cargar la interfaz del probador virtual.';
            });
          },
        ),
      );

    if (controller.platform is AndroidWebViewController) {
      final androidController = controller.platform as AndroidWebViewController;
      unawaited(
        androidController.setOnPlatformPermissionRequest((request) {
          if (request.types.length == 1 &&
              request.types.contains(WebViewPermissionResourceType.camera)) {
            unawaited(request.grant());
          } else {
            unawaited(request.deny());
          }
        }),
      );
    }

    if (!mounted) return;
    setState(() => _controller = controller);
    unawaited(controller.loadRequest(uri));
  }

  Future<void> _sendConfiguration() async {
    final controller = _controller;
    if (controller == null || _configurationSent) return;

    _configurationSent = true;
    final message = jsonEncode({
      'type': 'decart-try-on-config',
      'apiKey': AppConfig.decartApiKey.trim(),
      'garmentImageUrl': widget.garmentImageUrl.trim(),
      'productName': widget.productName,
      'keepSessionActive': true,
    });

    try {
      await controller.runJavaScript(
        'window.postMessage($message, window.location.origin);',
      );
      if (mounted) setState(() => _isLoading = false);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'No se pudo inicializar la sesión del probador virtual.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Probar prenda'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Cerrar',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: _errorMessage != null
          ? _ErrorView(message: _errorMessage!)
          : _controller == null
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                WebViewWidget(controller: _controller!),
                if (_isLoading)
                  const ColoredBox(
                    color: Colors.white,
                    child: Center(child: CircularProgressIndicator()),
                  ),
              ],
            ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 16),
            Text(message, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
