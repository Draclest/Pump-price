import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Inner SVG markup for each icon (viewBox 0 0 24 24).
 * `fill` icons paint with currentColor; everything else is stroked.
 */
interface IconDef { body: string; fill?: boolean; }

const ICONS: Record<string, IconDef> = {
  locate:   { body: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/><circle cx="12" cy="12" r="9" stroke-dasharray="2 3"/>' },
  locating: { body: '<path d="M12 17c-3-3.4-5.5-6-5.5-8.5a5.5 5.5 0 0 1 11 0c0 2.5-2.5 5.1-5.5 8.5z"/><circle cx="12" cy="8.5" r="1.8" fill="currentColor" stroke="none"/><ellipse class="locate-pulse" cx="12" cy="20" rx="6.5" ry="2.2" stroke-width="1.6" stroke-dasharray="2.5 2.5"/>' },
  pin:      { body: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>' },
  route:    { body: '<path d="M3 3h7l7 9-7 9H3l7-9z"/>' },
  search:   { body: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' },
  filter:   { body: '<line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>' },
  clock:    { body: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
  close:    { body: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' },
  alert:    { body: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' },
  share:    { body: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>' },
  list:     { body: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' },
  'chevron-down': { body: '<polyline points="6 9 12 15 18 9"/>' },
  'chevron-up':   { body: '<polyline points="18 15 12 9 6 15"/>' },
  spinner:  { body: '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>' },
  edit:     { body: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>' },
  nav:      { body: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>' },
  history:  { body: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>' },
  lock:     { body: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>' },
  star:     { body: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>', fill: true },
  pump:     { body: '<path d="M3 22V8l9-4 9 4v14"/><path d="M10 14h4"/><path d="M12 14v4"/><circle cx="18" cy="9" r="1"/><path d="M18 10v5a1 1 0 0 0 2 0v-3l-2-2"/>' },
  car:      { body: '<path d="M5 11l1.6-4.3A2 2 0 0 1 8.5 5.4h7a2 2 0 0 1 1.9 1.3L19 11"/><path d="M4 11h16v5H4z"/><circle cx="7.5" cy="16.5" r="1.6"/><circle cx="16.5" cy="16.5" r="1.6"/>' },
};

export type IconName = keyof typeof ICONS;

/**
 * Single source of truth for the inline SVG icons used across the app.
 * Replaces ~40 copy-pasted <svg> blocks. Usage: <app-icon name="locate" [size]="16" />
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="ic" [class.ic--spin]="spin" [innerHTML]="svg"></span>`,
  styles: [`
    .ic { display: inline-flex; line-height: 0; }
    .ic--spin { animation: ic-spin 0.85s linear infinite; }
    @keyframes ic-spin { to { transform: rotate(360deg); } }
  `],
})
export class IconComponent {
  private _name!: string;
  private _size = 16;
  private _stroke = 2;

  @Input({ required: true }) set name(v: string) { this._name = v; this._build(); }
  @Input() set size(v: number) { this._size = v; this._build(); }
  @Input() set strokeWidth(v: number) { this._stroke = v; this._build(); }
  @Input() spin = false;

  svg: SafeHtml = '';

  constructor(private readonly sanitizer: DomSanitizer) {}

  private _build(): void {
    const def = ICONS[this._name];
    if (!def) { this.svg = ''; return; }
    const paint = def.fill
      ? `fill="currentColor"`
      : `fill="none" stroke="currentColor" stroke-width="${this._stroke}" stroke-linecap="round" stroke-linejoin="round"`;
    const markup =
      `<svg width="${this._size}" height="${this._size}" viewBox="0 0 24 24" ${paint} aria-hidden="true">${def.body}</svg>`;
    this.svg = this.sanitizer.bypassSecurityTrustHtml(markup);
  }
}
