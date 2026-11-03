import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { JornadaPollingService } from './core/services/jornada-polling.service';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})

export class App implements OnInit, OnDestroy {
  protected readonly title = signal('frontend');
  private readonly jornadaService = inject(JornadaPollingService);

  ngOnInit(): void {
    // El polling vigila activamente el estado sin importar en qué vista esté el operador
    this.jornadaService.iniciarPolling();
  }

  ngOnDestroy(): void {
    this.jornadaService.detenerPolling();
  }
}