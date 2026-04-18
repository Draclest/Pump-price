/**
 * IngestionStatusService
 *
 * Polls /api/v1/ingestion/status at startup and exposes the result as a signal.
 * Used to show a banner while the initial data load is in progress.
 */
import { Injectable, OnDestroy, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export type IngestionStatus = 'idle' | 'running' | 'done' | 'error' | 'unknown';

export interface IngestionState {
  status: IngestionStatus;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  result: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class IngestionStatusService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly url  = `${environment.apiUrl}/ingestion/status`;

  private _state = signal<IngestionState>({
    status: 'unknown', started_at: null, finished_at: null, error: null, result: {},
  });

  /** True while data is being fetched for the first time. */
  readonly isLoading = computed(() =>
    this._state().status === 'running' || this._state().status === 'idle'
  );

  readonly state = this._state.asReadonly();

  private _timer: ReturnType<typeof setInterval> | null = null;

  startPolling(): void {
    this._poll();
    // Poll every 5 s while running, every 30 s otherwise
    this._timer = setInterval(() => this._poll(), 5_000);
  }

  private _poll(): void {
    this.http.get<IngestionState>(this.url).subscribe({
      next: (s) => {
        this._state.set(s);
        // Stop polling once done or in error — no point continuing
        if ((s.status === 'done' || s.status === 'error') && this._timer) {
          clearInterval(this._timer);
          this._timer = null;
        }
      },
      error: () => {
        // API unreachable — don't crash the app, just mark unknown
        this._state.set({ ...this._state(), status: 'unknown' });
      },
    });
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
  }
}
