import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { toast } from '@spartan-ng/brain/sonner';

import { HlmBadgeImports } from '../../../components/badge/src';
import { HlmButton } from '../../../components/button/src';
import { HlmCardImports } from '../../../components/card/src';
import { getErrorMessage } from '../../../core/utils/http-error.util';
import {
  VoiceCapabilitiesResponse,
  VoiceReportResponse,
} from '../../shared/models/report.model';
import { ReportsApiService } from '../../shared/services/reports-api.service';

@Component({
  selector: 'app-voice-assistant-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmButton, HlmCardImports, HlmBadgeImports],
  templateUrl: './voice-assistant-modal.component.html',
  styleUrls: ['./voice-assistant-modal.component.css'],
})
export class VoiceAssistantModalComponent implements OnInit, OnDestroy {
  private readonly reportsApi = inject(ReportsApiService);

  @Input() isOpen = false;
  @Input() branchId: string | null = null;
  @Output() close = new EventEmitter<void>();

  @ViewChild('queryInput') queryInputElement?: ElementRef<HTMLInputElement>;

  // Estados del asistente
  readonly isListening = signal<boolean>(false);
  readonly isProcessing = signal<boolean>(false);
  readonly isSpeaking = signal<boolean>(false);
  readonly queryText = signal<string>('');
  readonly activeQuery = signal<string>('');
  readonly reportResult = signal<VoiceReportResponse | null>(null);
  readonly capabilities = signal<VoiceCapabilitiesResponse | null>(null);
  readonly planBlockedError = signal<string | null>(null);

  // Soporte de navegador
  readonly speechRecognitionSupported = signal<boolean>(false);
  readonly speechSynthesisSupported = signal<boolean>(false);

  private recognitionInstance: any = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  ngOnInit(): void {
    this.checkBrowserCapabilities();
    this.loadCapabilities();
  }

  ngOnDestroy(): void {
    this.stopListening();
    this.stopSpeaking();
  }

  private checkBrowserCapabilities(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.speechRecognitionSupported.set(!!SpeechRecognition);
    this.speechSynthesisSupported.set(typeof window !== 'undefined' && 'speechSynthesis' in window);

    if (SpeechRecognition) {
      this.recognitionInstance = new SpeechRecognition();
      this.recognitionInstance.continuous = false;
      this.recognitionInstance.interimResults = true;
      this.recognitionInstance.lang = 'es-BO';

      this.recognitionInstance.onstart = () => {
        this.isListening.set(true);
      };

      this.recognitionInstance.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          this.queryText.set(transcript);
        }
      };

      this.recognitionInstance.onerror = (event: any) => {
        this.isListening.set(false);
        if (event.error !== 'no-speech') {
          toast.error(`Error en micrófono: ${event.error}`);
        }
      };

      this.recognitionInstance.onend = () => {
        this.isListening.set(false);
        const text = this.queryText().trim();
        if (text && !this.isProcessing()) {
          // Ejecutar automáticamente al terminar de hablar
          this.submitQuery(text);
        }
      };
    }
  }

  private loadCapabilities(): void {
    this.reportsApi.getVoiceCapabilities().subscribe({
      next: (res) => {
        if (res.data) {
          this.capabilities.set(res.data);
        }
      },
      error: () => {
        // Fallback silencioso con sugerencias por defecto
        this.capabilities.set({
          ai_available: true,
          model: 'gemini-2.5-flash',
          language: 'es',
          supported_topics: ['Ventas', 'Top Prendas', 'Stock Crítico', 'Devoluciones y Cambios'],
          suggested_queries: [
            '¿Cuáles son las prendas más vendidas y cuánto hemos facturado?',
            '¿Qué artículos tienen stock crítico menor o igual a 5 unidades?',
            '¿Cuánto dinero hemos retenido en devoluciones operativas?',
            '¿Cuál es el ticket promedio y el desglose de ventas por canal?',
          ],
        });
      },
    });
  }

  toggleListening(): void {
    if (this.isListening()) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  startListening(): void {
    if (!this.speechRecognitionSupported()) {
      toast.warning('Tu navegador no soporta captura de voz directa. Puedes escribir tu consulta abajo.');
      this.focusInput();
      return;
    }

    this.stopSpeaking();
    this.planBlockedError.set(null);
    this.queryText.set('');

    try {
      this.recognitionInstance?.start();
    } catch {
      // Si ya estaba activo, reiniciar
      this.recognitionInstance?.stop();
      setTimeout(() => this.recognitionInstance?.start(), 150);
    }
  }

  stopListening(): void {
    if (this.isListening()) {
      try {
        this.recognitionInstance?.stop();
      } catch {
        // Ignorar
      }
      this.isListening.set(false);
    }
  }

  submitQuery(customQuery?: string): void {
    const text = (customQuery || this.queryText()).trim();
    if (!text) {
      toast.info('Por favor formula una pregunta para el asistente ejecutivo.');
      return;
    }

    this.stopListening();
    this.stopSpeaking();
    this.isProcessing.set(true);
    this.planBlockedError.set(null);
    this.activeQuery.set(text);

    this.reportsApi.queryVoiceReport(text, this.branchId).subscribe({
      next: (res) => {
        this.isProcessing.set(false);
        const data = res.data;
        if (data) {
          this.reportResult.set(data);

          if (data.is_fallback) {
            toast.warning('Gemini API no disponible temporalmente. Se generó el reporte con el motor analítico local.');
          } else {
            toast.success('Reporte ejecutivo generado con Gemini 2.5 Flash.');
          }

          // Iniciar locución por voz si está soportada
          if (this.speechSynthesisSupported() && data.speech_text) {
            this.speakText(data.speech_text);
          }
        }
      },
      error: (err) => {
        this.isProcessing.set(false);
        if (err.status === 403) {
          this.planBlockedError.set(
            err.error?.detail ||
              'El Plan Básico no incluye acceso a la IA Generativa. Actualiza al Plan Profesional o Empresarial para habilitar este asistente.',
          );
        } else {
          toast.error(getErrorMessage(err, 'Error al consultar al asistente ejecutivo.'));
        }
      },
    });
  }

  applySuggestion(suggestion: string): void {
    this.queryText.set(suggestion);
    this.submitQuery(suggestion);
  }

  speakText(text: string): void {
    if (!this.speechSynthesisSupported() || !text) return;

    this.stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-BO';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Intentar buscar voz nativa en español
    const voices = window.speechSynthesis.getVoices();
    const esVoice =
      voices.find((v) => v.lang.startsWith('es') && (v.name.includes('Natural') || v.name.includes('Google'))) ||
      voices.find((v) => v.lang.startsWith('es'));
    if (esVoice) {
      utterance.voice = esVoice;
    }

    utterance.onstart = () => this.isSpeaking.set(true);
    utterance.onend = () => this.isSpeaking.set(false);
    utterance.onerror = () => this.isSpeaking.set(false);

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if (this.speechSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.isSpeaking.set(false);
      this.currentUtterance = null;
    }
  }

  toggleSpeech(): void {
    if (this.isSpeaking()) {
      this.stopSpeaking();
    } else if (this.reportResult()?.speech_text) {
      this.speakText(this.reportResult()!.speech_text);
    }
  }

  resetConversation(): void {
    this.stopListening();
    this.stopSpeaking();
    this.reportResult.set(null);
    this.queryText.set('');
    this.activeQuery.set('');
    this.planBlockedError.set(null);
    this.focusInput();
  }

  handleBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }

  onClose(): void {
    this.stopListening();
    this.stopSpeaking();
    this.close.emit();
  }

  private focusInput(): void {
    setTimeout(() => {
      this.queryInputElement?.nativeElement.focus();
    }, 100);
  }

  getObjectKeys(obj: Record<string, any> | undefined): string[] {
    return obj ? Object.keys(obj) : [];
  }
}
