import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { StationCardComponent } from '../station-card/station-card.component';
import { IconComponent } from '../ui/icon.component';
import { Station } from '../../models/station.model';

/**
 * Renders the recommendation results: an optional share row, a highlighted
 * "top" section and an "others" section, plus the empty state.
 *
 * Replaces four near-identical blocks that were duplicated across the desktop
 * sidebar and the mobile sheet (nearby + route variants each).
 */
@Component({
  selector: 'app-station-list',
  standalone: true,
  imports: [StationCardComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showShare) {
      <div class="share-row">
        <button class="btn-share" type="button" (click)="share.emit()">
          @if (!shareConfirm) { <app-icon name="share" [size]="13" /> }
          {{ shareConfirm ? '✓ Lien copié !' : "Partager l'itinéraire" }}
        </button>
      </div>
    }

    @if (empty) {
      <div class="list-empty">{{ emptyLabel }}</div>
    }

    @if (top3.length > 0) {
      <div class="section-title section-title--top3"><span aria-hidden="true">{{ topLabel }}</span></div>
      @for (s of top3; track s.id) {
        <app-station-card [station]="s" [selected]="selectedId === s.id"
          [highlightFuel]="highlightFuel" [routeMode]="routeMode"
          [originLat]="originLat" [originLon]="originLon" [destLat]="destLat" [destLon]="destLon"
          (select)="select.emit($event)" (historyRequested)="history.emit($event)"
          (hovered)="hover.emit($event)" (exportToMaps)="exportToMaps.emit(s)">
        </app-station-card>
      }
    }

    @if (others.length > 0) {
      <div class="section-title">{{ othersLabel }} <span class="section-count">{{ others.length }}</span></div>
      @for (s of others; track s.id) {
        <app-station-card [station]="s" [selected]="selectedId === s.id"
          [highlightFuel]="highlightFuel" [routeMode]="routeMode"
          [originLat]="originLat" [originLon]="originLon" [destLat]="destLat" [destLon]="destLon"
          (select)="select.emit($event)" (historyRequested)="history.emit($event)"
          (hovered)="hover.emit($event)" (exportToMaps)="exportToMaps.emit(s)">
        </app-station-card>
      }
    }
  `,
  styles: [`
    .share-row { padding: var(--space-2) var(--space-3) 0; }
    .btn-share {
      display: flex; align-items: center; gap: 7px; width: 100%; padding: 9px var(--space-4);
      background: var(--color-primary-subtle); border: 1.5px solid var(--color-primary-muted);
      border-radius: var(--radius-md); color: var(--color-primary);
      font-size: var(--font-size-sm); font-family: var(--font-family); font-weight: 700;
      cursor: pointer; justify-content: center; transition: all var(--transition-fast);
      -webkit-tap-highlight-color: transparent;
    }
    .btn-share:hover  { background: var(--color-primary-light); }
    .btn-share:active { opacity: 0.8; transform: scale(0.98); }

    .section-title {
      display: flex; align-items: center; gap: 6px;
      font-size: var(--font-size-xs); font-weight: 700;
      color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.7px;
      padding: var(--space-3) var(--space-4) var(--space-1);
    }
    .section-title--top3 { color: var(--color-accent-dark); }
    .section-count {
      background: var(--color-surface-3); color: var(--color-text-muted);
      font-size: 10px; font-weight: 700; padding: 1px 6px;
      border-radius: var(--radius-pill); margin-left: 2px;
    }
    .list-empty { padding: var(--space-6) var(--space-4); font-size: var(--font-size-sm); color: var(--color-text-muted); text-align: center; }
  `],
})
export class StationListComponent {
  @Input() top3: Station[] = [];
  @Input() others: Station[] = [];
  @Input() topLabel = '';
  @Input() othersLabel = 'Autres';
  @Input() emptyLabel = 'Aucune station trouvée';
  @Input() empty = false;
  @Input() routeMode = false;
  @Input() selectedId: string | null = null;
  @Input() highlightFuel = 'SP95';
  @Input() originLat?: number;
  @Input() originLon?: number;
  @Input() destLat?: number;
  @Input() destLon?: number;
  @Input() showShare = false;
  @Input() shareConfirm = false;

  @Output() readonly select       = new EventEmitter<Station>();
  @Output() readonly history      = new EventEmitter<Station>();
  @Output() readonly hover        = new EventEmitter<string | null>();
  @Output() readonly exportToMaps = new EventEmitter<Station>();
  @Output() readonly share        = new EventEmitter<void>();
}
