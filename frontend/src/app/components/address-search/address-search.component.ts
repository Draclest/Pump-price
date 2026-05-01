import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { GeocodingService, AddressSuggestion } from '../../services/geocoding.service';

@Component({
  selector: 'app-address-search',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search-wrap">
      <div class="search-field" [class.search-field--focused]="focused">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             aria-hidden="true">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>

        <input #input type="text" class="search-input"
               placeholder="Rechercher une adresse…"
               autocomplete="off" autocorrect="off" spellcheck="false"
               aria-label="Rechercher une adresse"
               aria-autocomplete="list"
               [attr.aria-expanded]="showSuggestions() && suggestions().length > 0"
               [(ngModel)]="query"
               (ngModelChange)="onQueryChange($event)"
               (focus)="focused = true; showSuggestions.set(true)"
               (blur)="focused = false" />

        @if (query) {
          <button class="clear-btn" type="button" aria-label="Effacer la recherche"
                  (click)="clear()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        }
      </div>

      @if (showSuggestions() && suggestions().length > 0) {
        <ul class="suggestions" role="listbox" aria-label="Suggestions d'adresses">
          @for (s of suggestions(); track $index) {
            <li class="suggestion-item" role="option" (mousedown)="select(s)">
              <svg class="sug-icon" width="13" height="13" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span class="sug-label">{{ s.label }}</span>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .search-wrap { position: relative; }

    .search-field {
      display: flex;
      align-items: center;
      background: var(--color-bg);
      border-radius: var(--radius-md);
      padding: 0 var(--space-3);
      border: 1.5px solid var(--color-border);
      gap: var(--space-2);
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .search-field--focused {
      border-color: var(--color-primary);
      background: var(--color-surface);
      box-shadow: 0 0 0 3px var(--color-primary-light);
    }

    .search-icon { color: var(--color-text-muted); flex-shrink: 0; transition: color var(--transition-fast); }
    .search-field--focused .search-icon { color: var(--color-primary); }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      padding: 9px 0;
      font-size: var(--font-size-sm);
      font-family: var(--font-family);
      color: var(--color-text-primary);
      outline: none;
      min-width: 0;
    }
    .search-input::placeholder { color: var(--color-text-muted); }

    .clear-btn {
      background: var(--color-border);
      border: none;
      border-radius: 50%;
      width: 20px; height: 20px;
      padding: 0;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .clear-btn:hover { background: var(--color-text-muted); color: #fff; }

    .suggestions {
      position: absolute;
      top: calc(100% + 6px);
      left: 0; right: 0;
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      list-style: none;
      margin: 0;
      padding: var(--space-1) 0;
      z-index: 100;
      overflow: hidden;
      animation: dropdown-in 0.15s ease;
    }

    @keyframes dropdown-in {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .suggestion-item {
      padding: 10px var(--space-3);
      font-size: var(--font-size-sm);
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 9px;
      color: var(--color-text-primary);
      transition: background var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .suggestion-item:hover { background: var(--color-primary-light); }

    .sug-icon { color: var(--color-primary); flex-shrink: 0; margin-top: 1px; }

    .sug-label {
      line-height: 1.4;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  `],
})
export class AddressSearchComponent implements OnChanges {
  @Input() prefill: { lat: number; lon: number; label: string } | null = null;
  @Output() readonly locationSelected = new EventEmitter<{ lat: number; lon: number; label: string }>();

  private readonly geocoding  = inject(GeocodingService);
  private readonly el         = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  query    = '';
  focused  = false;

  readonly suggestions    = signal<AddressSuggestion[]>([]);
  readonly showSuggestions = signal(false);

  private readonly query$ = new Subject<string>();

  constructor() {
    this.query$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap(q => q.trim().length >= 3 ? this.geocoding.search(q) : of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(results => this.suggestions.set(results));
  }

  ngOnChanges(): void {
    if (this.prefill) {
      this.query = this.prefill.label;
      this.suggestions.set([]);
      this.showSuggestions.set(false);
    }
  }

  onQueryChange(val: string): void {
    this.query$.next(val);
    this.showSuggestions.set(true);
  }

  select(s: AddressSuggestion): void {
    this.query = s.label;
    this.suggestions.set([]);
    this.showSuggestions.set(false);
    this.locationSelected.emit({ lat: s.lat, lon: s.lon, label: s.label });
  }

  clear(): void {
    this.query = '';
    this.suggestions.set([]);
    this.query$.next('');
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showSuggestions.set(false);
    }
  }
}
