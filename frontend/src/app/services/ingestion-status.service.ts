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
  private _timeout: ReturnType<typeof setTimeout> | null = null;

  // Maximum time to show the loading banner before giving up
  private static readonly MAX_LOADING_MS = 3 * 60 * 1_000; // 3 minutes

  startPolling(): void {
    this._poll();
    this._timer = setInterval(() => this._poll(), 5_000);
    // Safety valve: stop showing the banner after MAX_LOADING_MS regardless
    this._timeout = setTimeout(() => {
      if (this.isLoading()) {
        this._state.set({ ...this._state(), status: 'unknown' });
      }
      this._stop();
    }, IngestionStatusService.MAX_LOADING_MS);
  }

  private _stop(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
    if (this._timeout) { clearTimeout(this._timeout); this._timeout = null; }
  }

  private _poll(): void {
    this.http.get<IngestionState>(this.url).subscribe({
      next: (s) => {
        this._state.set(s);
        // Stop polling once done or in error — no point continuing
        if (s.status === 'done' || s.status === 'error') {
          this._stop();
        }
      },
      error: () => {
        this._state.set({ ...this._state(), status: 'unknown' });
        this._stop();
      },
    });
  }

  ngOnDestroy(): void { this._stop(); }
}
