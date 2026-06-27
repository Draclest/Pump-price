import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { SortBy } from '../../models/station.model';

const SORT_OPTIONS: { value: SortBy; label: string; icon: string }[] = [
  { value: 'score',     label: 'Score',    icon: '★' },
  { value: 'price',     label: 'Prix',     icon: '€' },
  { value: 'distance',  label: 'Distance', icon: '📍' },
  { value: 'freshness', label: 'Récent',   icon: '🕐' },
];
const NETGAIN_OPTION: { value: SortBy; label: string; icon: string } =
  { value: 'netgain', label: 'Gain net', icon: '⚡' };

/**
 * Sort chips bound to AppStateService.sortBy.
 * Replaces the 3 copy-pasted sort bars that lived in AppComponent.
 */
@Component({
  selector: 'app-sort-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sort-bar" [class.sort-bar--sheet]="variant === 'sheet'" role="group" aria-label="Trier par">
      @for (opt of options(); track opt.value) {
        <button class="sort-btn" type="button"
                [class.sort-btn--active]="state.sortBy() === opt.value"
                (click)="state.sortBy.set(opt.value)">
          <span class="sort-btn-icon" aria-hidden="true">{{ opt.icon }}</span>
          {{ opt.label }}
        </button>
      }
    </div>
  `,
  styles: [`
    .sort-bar {
      display: flex; gap: 6px; padding: var(--space-2) var(--space-4);
      border-bottom: 1px solid var(--color-border-subtle); flex-shrink: 0;
      overflow-x: auto; scrollbar-width: none; background: var(--color-surface);
    }
    .sort-bar--sheet { padding: 8px 12px; }
    .sort-bar::-webkit-scrollbar { display: none; }

    .sort-btn {
      display: flex; align-items: center; gap: 5px;
      padding: 5px 10px; border-radius: var(--radius-pill);
      border: 1.5px solid var(--color-border); background: var(--color-surface-2);
      font-size: 11px; font-weight: 600; font-family: var(--font-family);
      color: var(--color-text-secondary); cursor: pointer; white-space: nowrap;
      transition: all var(--transition-fast); -webkit-tap-highlight-color: transparent;
      flex-shrink: 0;
    }
    .sort-btn:hover { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-subtle); }
    .sort-btn--active {
      background: var(--color-primary); border-color: var(--color-primary); color: #fff;
      box-shadow: 0 2px 8px rgba(22,163,74,0.25);
    }
    .sort-btn-icon { font-size: 12px; }
  `],
})
export class SortBarComponent {
  readonly state = inject(AppStateService);
  readonly options = computed(() =>
    this.state.vehicle.hasProfile() ? [NETGAIN_OPTION, ...SORT_OPTIONS] : SORT_OPTIONS
  );

  @Input() variant: 'default' | 'sheet' = 'default';
}
