# Branding pump-price — palette, logo &amp; icônes

> Référence de marque destinée à l'agent. Elle contient (1) le système de couleurs en tokens, (2) les logos et icônes SVG à extraire en fichiers, (3) les consignes de génération favicon/PWA. Les valeurs hex et les noms de tokens font foi. En cas de doute sur une convention (chemin des assets, dark mode via classe vs media), aligne-toi sur le repo existant.

## 1. Logos SVG

Trois fichiers à créer à partir des blocs ci-dessous.

### `public/logo.svg` — lockup horizontal (mark + wordmark)

Usage : header, page marketing, README. Le wordmark est en **Space Grotesk** (chargée via `@import`). Pour un rendu garanti hors navigateur (ex. `<img>`), self-hoster la police ou vectoriser le texte en tracés.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80" width="280" height="80" role="img" aria-label="pump-price">
  <title>pump-price</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500&amp;display=swap');
    .ink { fill: #0F172A; }
    .mut { fill: #94A3B8; }
    @media (prefers-color-scheme: dark) { .ink { fill: #F1F5F9; } }
  </style>
  <g transform="translate(8,8)">
    <rect x="12" y="8" width="28" height="48" rx="5" fill="#16A34A"/>
    <rect x="17" y="14" width="18" height="11" rx="2" fill="#FFFFFF"/>
    <path d="M40 26 q12 0 12 11 v8" fill="none" stroke="#16A34A" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="47" y="44" width="11" height="12" rx="3" fill="#16A34A"/>
  </g>
  <text x="84" y="50" font-family="'Space Grotesk','Segoe UI',system-ui,-apple-system,sans-serif" font-size="28" font-weight="500" letter-spacing="-0.5">
    <tspan class="ink">pump</tspan><tspan class="mut">-</tspan><tspan fill="#16A34A">price</tspan>
  </text>
</svg>
```

### `public/icon.svg` — mark carré transparent (source du favicon)

Usage : `favicon.svg`, avatar, badge CLI. Pas de texte → aucune dépendance police. Couleur fixe (les renderers de favicon ignorent souvent `prefers-color-scheme`) ; le vert tient sur onglet clair comme sombre.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="pump-price">
  <g transform="translate(-3,0)">
    <rect x="12" y="8" width="28" height="48" rx="5" fill="#16A34A"/>
    <rect x="17" y="14" width="18" height="11" rx="2" fill="#FFFFFF"/>
    <path d="M40 26 q12 0 12 11 v8" fill="none" stroke="#16A34A" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="47" y="44" width="11" height="12" rx="3" fill="#16A34A"/>
  </g>
</svg>
```

### `public/icon-maskable.svg` — tuile carrée (app icon / PWA)

Usage : source des PNG `apple-touch-icon`, `icon-192/512`, `icon-maskable`. Fond plein bord à bord (l'OS masque les coins), mark blanc centré dans la zone de sécurité.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="pump-price">
  <rect width="512" height="512" fill="#16A34A"/>
  <g transform="translate(56,56) scale(6.25)">
    <g transform="translate(-3,0)">
      <rect x="12" y="8" width="28" height="48" rx="5" fill="#FFFFFF"/>
      <rect x="17" y="14" width="18" height="11" rx="2" fill="#16A34A"/>
      <path d="M40 26 q12 0 12 11 v8" fill="none" stroke="#FFFFFF" stroke-width="4.5" stroke-linecap="round"/>
      <rect x="47" y="44" width="11" height="12" rx="3" fill="#FFFFFF"/>
    </g>
  </g>
</svg>
```

## 2. Favicon &amp; icônes d'app

### Génération des PNG (`scripts/gen-icons.mjs`)

Rasterise les SVG sources avec `sharp` (cohérent avec la stack Node) :

```js
import sharp from 'sharp';

const tasks = [
  ['public/icon.svg',          'public/favicon-16.png',          16],
  ['public/icon.svg',          'public/favicon-32.png',          32],
  ['public/icon-maskable.svg', 'public/apple-touch-icon.png',    180],
  ['public/icon-maskable.svg', 'public/icon-192.png',            192],
  ['public/icon-maskable.svg', 'public/icon-512.png',            512],
  ['public/icon-maskable.svg', 'public/icon-maskable-512.png',   512],
];

for (const [src, out, size] of tasks) {
  await sharp(src).resize(size, size).png().toFile(out);
  console.log('✓', out);
}
```

Lancement : `npm i -D sharp && node scripts/gen-icons.mjs`. Le `favicon.ico` est optionnel sur un setup moderne (SVG + PNG suffisent) ; si requis, dériver du PNG 32 via `png-to-ico`.

### `<head>`

```html
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#16A34A">
```

### `public/site.webmanifest`

```json
{
  "name": "pump-price",
  "short_name": "pump-price",
  "display": "standalone",
  "theme_color": "#16A34A",
  "background_color": "#0B1120",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`theme_color` en vert de marque, `background_color` en fond sombre pour l'écran de démarrage PWA.

## 3. Iconographie

Deux icônes pour le geste de géolocalisation, dessinées sur grille 24, en `currentColor` (elles héritent de la couleur du bouton et s'adaptent au thème). Au repos, le bouton « localiser » utilise le **viseur** ; pendant l'acquisition GPS, il bascule sur le **pin + pulse** (animable).

### `src/assets/icons/locate.svg` — bouton « localiser » (repos)

Convention universelle (Maps), aucune ambiguïté. Couleur recommandée : `--color-primary` (ou blanc sur bouton plein primaire).

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Me localiser">
  <line x1="12" y1="2.5" x2="12" y2="5"/>
  <line x1="12" y1="19" x2="12" y2="21.5"/>
  <line x1="2.5" y1="12" x2="5" y2="12"/>
  <line x1="19" y1="12" x2="21.5" y2="12"/>
  <circle cx="12" cy="12" r="6"/>
  <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
</svg>
```

### `src/assets/icons/locating.svg` — état « localisation en cours »

Affiché pendant l'acquisition de position ; l'ellipse au sol pulse (cf. animation ci-dessous). La classe `locate-pulse` sur l'`<ellipse>` est la cible de l'animation.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Localisation en cours">
  <path d="M12 17c-3-3.4-5.5-6-5.5-8.5a5.5 5.5 0 0 1 11 0c0 2.5-2.5 5.1-5.5 8.5z"/>
  <circle cx="12" cy="8.5" r="1.8" fill="currentColor" stroke="none"/>
  <ellipse class="locate-pulse" cx="12" cy="20" rx="6.5" ry="2.2" stroke-width="1.6" stroke-dasharray="2.5 2.5"/>
</svg>
```

### États &amp; usage

| État | Icône | Couleur | Comportement |
|------|-------|---------|--------------|
| repos | `locate` | `--color-primary` | action « centrer sur moi » |
| en cours | `locating` | `--color-primary` | pulse animé, bouton désactivé |
| échec / refus | `locate` | `--muted` | tooltip « position indisponible » |

- Glyphe 20–24 px dans une cible tactile ≥ 44 px.
- Bouton icône seule = bouton accessible : conserver un `aria-label` sur le `<button>` (ne pas se reposer uniquement sur le `<title>` du SVG).
- `currentColor` partout : ne jamais coder la couleur en dur dans le SVG, la piloter depuis le bouton.

### Animation du pulse (`styles.css`)

```css
@media (prefers-reduced-motion: no-preference) {
  .is-locating .locate-pulse {
    transform-box: fill-box;
    transform-origin: center;
    animation: locate-pulse 1.4s ease-in-out infinite;
  }
}
@keyframes locate-pulse {
  0%, 100% { opacity: .35; transform: scale(.8); }
  50%      { opacity: 1;   transform: scale(1.1); }
}
```

Respecte `prefers-reduced-motion` (pas d'animation si l'utilisateur la désactive).

## 4. Système de couleurs

Le produit porte un axe sémantique intégré (pas cher ↔ cher) : la palette sert cette lecture **autant que** l'identité. Ancre marque sur le vert (économie / feu vert / argent), accent ambre (énergie / carburant), neutres slate froids pour que le prix respire. Le **dark mode est prioritaire** (usage en voiture, de nuit) : le vert y est ravivé, pas recopié.

### Marque

| Rôle | Token | Light | Dark |
|------|-------|-------|------|
| Primaire (Deal Green) | `--color-primary` | `#16A34A` | `#22C55E` |
| Primaire clair | `--color-primary-light` | `#10B981` | `#4ADE80` |
| Primaire foncé | `--color-primary-dark` | `#15803D` | `#16A34A` |
| Accent (Fuel Amber) | `--color-accent` | `#F59E0B` | `#FBBF24` |
| Accent clair | `--color-accent-light` | `#FBBF24` | `#FCD34D` |
| Accent foncé | `--color-accent-dark` | `#D97706` | `#D97706` |

### Signal prix (donnée uniquement)

| Rôle | Token | Light | Dark |
|------|-------|-------|------|
| Bon plan | `--price-good` | `#16A34A` | `#22C55E` |
| Moyen | `--price-mid` | `#F59E0B` | `#FBBF24` |
| Cher | `--price-high` | `#EF4444` | `#F87171` |

### Neutres

| Rôle | Token | Light | Dark |
|------|-------|-------|------|
| Encre (texte, chiffres) | `--ink` | `#0F172A` | `#F1F5F9` |
| Texte secondaire | `--slate` | `#475569` | `#94A3B8` |
| Texte discret | `--muted` | `#94A3B8` | `#64748B` |
| Bordure | `--border` | `#E2E8F0` | `#1E293B` |
| Surface (cartes) | `--surface` | `#F8FAFC` | `#111827` |
| Fond | `--bg` | `#FFFFFF` | `#0B1120` |

## 5. Règles d'usage (non négociables)

- **Ratio 60/30/10** : ~60 % neutres &amp; surfaces, ~30 % encre/structure, ~10 % vert. Ambre encore plus parcimonieux (~5 %, CTA et états « timing »). Le rouge ne sort **que** sur la donnée prix, jamais en décoration.
- **Daltonisme — règle critique.** L'axe vert↔rouge du signal prix est le pire cas pour la deutéranopie/protanopie (~8 % des hommes). Ne **jamais** coder le prix par la teinte seule : toujours afficher la valeur en € **et** un glyphe directionnel (▼ moins cher / ▲ plus cher). Les extrêmes sont volontairement écartés (vert légèrement teal, « cher » vers l'orange-rouge) pour maximiser la séparation perçue.
- **Cohérence avec le net-gain engine.** Le verdict `worth_it / neutral / skip` du moteur de gain net se mappe sur l'échelle : `worth_it → --price-good`, `neutral → --price-mid`, `skip → --price-high` — toujours accompagné du montant signé. La couleur renforce le chiffre, elle ne le remplace pas.

## 6. Tokens prêts à coller

### CSS custom properties (`styles.css`)

```css
:root {
  /* Marque */
  --color-primary: #16A34A;
  --color-primary-light: #10B981;
  --color-primary-dark: #15803D;
  --color-accent: #F59E0B;
  --color-accent-light: #FBBF24;
  --color-accent-dark: #D97706;

  /* Signal prix (donnée) */
  --price-good: #16A34A;
  --price-mid: #F59E0B;
  --price-high: #EF4444;

  /* Neutres */
  --ink: #0F172A;
  --slate: #475569;
  --muted: #94A3B8;
  --border: #E2E8F0;
  --surface: #F8FAFC;
  --bg: #FFFFFF;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #22C55E;
    --color-primary-light: #4ADE80;
    --color-primary-dark: #16A34A;
    --color-accent: #FBBF24;
    --color-accent-light: #FCD34D;
    --color-accent-dark: #D97706;

    --price-good: #22C55E;
    --price-mid: #FBBF24;
    --price-high: #F87171;

    --ink: #F1F5F9;
    --slate: #94A3B8;
    --muted: #64748B;
    --border: #1E293B;
    --surface: #111827;
    --bg: #0B1120;
  }
}
```

### Tailwind (si le repo l'utilise)

```js
// tailwind.config.js
export default {
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#16A34A', light: '#10B981', dark: '#15803D' },
        accent:  { DEFAULT: '#F59E0B', light: '#FBBF24', dark: '#D97706' },
        price:   { good: '#16A34A', mid: '#F59E0B', high: '#EF4444' },
        ink: '#0F172A', slate: '#475569', muted: '#94A3B8',
        border: '#E2E8F0', surface: '#F8FAFC', bg: '#FFFFFF',
      },
    },
  },
};
```

Note : sous Angular sans Tailwind, les CSS custom properties §6.1 sont la voie par défaut (globales, supportées partout, dark mode automatique).

## 7. Tâches pour l'agent

- [ ] Créer `public/logo.svg`, `public/icon.svg`, `public/icon-maskable.svg` à partir des blocs §1.
- [ ] Créer `src/assets/icons/locate.svg` et `src/assets/icons/locating.svg` à partir des blocs §3.
- [ ] Ajouter `scripts/gen-icons.mjs` (§2), installer `sharp` en dev, générer les PNG.
- [ ] Créer `public/site.webmanifest` (§2) et insérer les balises `<head>` (§2) dans l'index.
- [ ] Ajouter les tokens CSS (§6.1) dans le stylesheet global ; brancher Tailwind (§6.2) seulement si déjà présent.
- [ ] Remplacer les couleurs en dur existantes par les tokens, en respectant le ratio 60/30/10.
- [ ] Câbler le bouton « localiser » : repos = `locate`, acquisition = `locating` (pulse), échec = `locate` en `--muted` ; conserver l'`aria-label` (§3).
- [ ] Pour tout affichage de prix : doubler systématiquement couleur + valeur € + glyphe directionnel (règle daltonisme §5).
- [ ] DoD : favicon visible (onglet clair et sombre), PWA installable avec icône maskable correcte, bouton localiser avec ses 3 états, dark mode cohérent, aucune couleur de prix codée par la teinte seule.