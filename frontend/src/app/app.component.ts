import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { JornadaPollingService } from './core/services/jornada-polling.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
    
    @if (jornadaService.jornadaCerradaModalVisible()) {
      <div class="fixed inset-0 z-100 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div class="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-bold text-slate-900">Jornada Reiniciada</h3>
          <p class="text-sm text-slate-600">El sistema ha sido archivado y cerrado por otro operador.</p>
          <button (click)="recargarPagina()" class="w-full mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-md font-medium transition-colors cursor-pointer">
            Entendido, recargar jornada
          </button>
        </div>
      </div>
    }
  `
})

export class App implements OnInit, OnDestroy {
  public jornadaService = inject(JornadaPollingService);

  ngOnInit(): void {
    this.jornadaService.iniciarPolling();
  }

  ngOnDestroy(): void {
    this.jornadaService.detenerPolling();
  }

  public recargarPagina(): void {
    window.location.reload();
  }
}