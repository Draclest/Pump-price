# CLAUDE.md — Pump Price (Prix à la Pompe)

> Référence vivante du projet. Mise à jour après chaque session significative.
> Graphify last run : 2026-05-01 — 425 nodes · 537 edges · 32 communities.

---

## 1. Vision produit

**Objectif** : Aider l'utilisateur à prendre la **meilleure décision de ravitaillement**, pas seulement trouver le prix le plus bas. Le moteur calcule le coût réel (carburant + trajet), un score 0-100, des tendances de prix et des labels de recommandation contextuels.

**Audience** : Grand public, mobile-first, France métropolitaine.

---

## 2. Stack technique

| Couche | Technologie |
|--------|------------|
| Backend | Python 3.12 · FastAPI 0.115 · uvicorn |
| Stockage | Elasticsearch 8 (index `fuel-stations` + `fuel-price-history`) |
| Frontend | Angular 18 (standalone, signals) · Leaflet (tiles OSM) |
| Infra | Docker Compose · Nginx (reverse proxy + CSP) |
| Observabilité | OpenTelemetry SDK (traces + métriques + logs, OTLP HTTP port 4318) |
| Données | data.gouv.fr (quotidien + flux instantané v2) · OpenStreetMap Overpass |
| Routing | OSRM public (`router.project-osrm.org`) |
| Géocodage | api-adresse.data.gouv.fr · Nominatim (reverse geocode) |

---

## 3. Structure monorepo

```
prix à la pompe/
├── backend/
│   ├── app/
│   │   ├── main.py                  # Entrypoint FastAPI, middlewares, scheduler APScheduler
│   │   ├── config.py                # Settings Pydantic (toutes les vars d'env)
│   │   ├── api/
│   │   │   ├── stations.py          # GET /stations/search, /recommend, /route-recommend
│   │   │   ├── ingestion.py         # POST /ingestion/trigger, GET /ingestion/status
│   │   │   └── deps.py              # Dépendances FastAPI (get_es, api_key_guard)
│   │   ├── models/station.py        # Pydantic Station, FuelPrice, StationSearchResult
│   │   ├── services/
│   │   │   ├── elasticsearch_client.py  # AsyncElasticsearch, INDEX_NAME, mappings ES
│   │   │   ├── scoring_service.py       # Moteur de score 0-100 nearby + route
│   │   │   ├── station_service.py       # search_stations(), get_station_by_id(), _to_result()
│   │   │   ├── gov_client.py            # fetch quotidien + live feed data.gouv.fr
│   │   │   ├── osm_enrichment.py        # Overpass → index spatial → cross_reference()
│   │   │   ├── routing_service.py       # OSRM get_route(), filter_stations_near_route()
│   │   │   ├── brand_logos.py           # get_logo_url(), get_brand_color(), get_display_name()
│   │   │   ├── ingestion_state.py       # Singleton IngestionState (thread-safe)
│   │   │   └── opening_hours.py         # Parser OSM opening_hours → is_open_now()
│   │   ├── workers/
│   │   │   ├── ingestion.py         # run_ingestion() — pipeline complète quotidienne
│   │   │   ├── live_feed.py         # run_live_feed() — patch prix toutes les 10 min
│   │   │   └── refresh.py           # schedule_refresh() — MAJ stations périmées post-search
│   │   └── observability/
│   │       └── telemetry.py         # setup_telemetry(), instrument_fastapi()
│   ├── tests/
│   │   ├── test_scoring.py          # Tests purs scoring (pas de dépendances externes)
│   │   ├── test_config.py           # Validation Settings, CORS, clés manquantes
│   │   ├── test_api.py              # Tests ASGI avec mock ES
│   │   └── test_ingestion.py        # Tests parsing station gouv.fr
│   └── requirements.txt
├── frontend/
│   ├── src/app/
│   │   ├── app.component.ts         # Shell : sidebar desktop + bottom sheet mobile
│   │   ├── app.config.ts            # Bootstrap Angular standalone
│   │   ├── models/station.model.ts  # Interfaces TS : Station, FuelPrice, SortBy, FilterValues
│   │   ├── components/
│   │   │   ├── map/                 # Leaflet, markers diff, ResizeObserver, invalidateSize
│   │   │   ├── station-card/        # Card résultat avec score, prix hero, actions
│   │   │   ├── filters/             # Carburant, rayon, prix max, services
│   │   │   ├── address-search/      # Autocomplétion api-adresse.data.gouv.fr
│   │   │   ├── route-panel/         # Saisie départ/arrivée, détour max
│   │   │   └── price-history/       # Graphique SVG Catmull-Rom des prix historiques
│   │   ├── services/
│   │   │   ├── app-state.service.ts     # Source de vérité unique (signals Angular)
│   │   │   ├── station.service.ts       # HTTP → /api/v1/stations
│   │   │   ├── station-cache.service.ts # Cache mémoire + haversineKm()
│   │   │   ├── geocoding.service.ts     # search() + reverseGeocode()
│   │   │   ├── geolocation.service.ts   # getCurrentPosition() → Observable
│   │   │   ├── routing.service.ts       # getRouteRecommendations(), exportToGoogleMaps()
│   │   │   ├── price-history.service.ts # getHistory() → série temporelle par carburant
│   │   │   └── ingestion-status.service.ts # Polling /ingestion/status
│   │   └── utils/
│   │       ├── brand.utils.ts       # brandInitial(), safeBrandColor()
│   │       └── navigation.util.ts   # openRoute(), routeUrl()
│   ├── src/styles.scss              # Design tokens globaux, dark mode, Leaflet overrides
│   ├── angular.json                 # Budgets : anyComponentStyle 32kb, fonts.inline false
│   └── nginx/default.conf.template  # Proxy /api/, CSP, HSTS conditionnel
├── docker-compose.yml
├── .env.example
└── CLAUDE.md  ← ce fichier
```

---

## 4. Architecture de données

### Index Elasticsearch `fuel-stations`

Champs clés : `id` (keyword), `location` (geo_point), `fuels` (nested : type/price/updated_at), `brand_key`, `services` (keyword[]), `is_open`, `opening_hours`, `gov_last_updated`, `osm_last_updated`, `ingested_at`.

Shards : 1 · Replicas : 0 (mono-nœud local).

### Index `fuel-price-history`

Série temporelle des prix par station + carburant. Rétention : `PRICE_HISTORY_DAYS` jours (défaut 30). Nettoyage via `_cleanup_old_history()` à chaque ingestion.

### Pipeline d'ingestion (quotidienne, 11h — `run_ingestion()`)

```
gov_client.fetch_all()                # JSON quotidien ~74k stations
  → osm_enrichment.cross_reference()  # Overpass → index spatial KD-tree → geo <50m
  → bulk index ES (fuel-stations)
  → _index_history()                  # Snapshot prix dans fuel-price-history
  → _cleanup_old_history()            # Supprime > PRICE_HISTORY_DAYS
```

Bootstrap : si l'index est vide au démarrage → `run_ingestion()` automatique (3 tentatives, backoff exponentiel 2s/4s).

### Live feed (`run_live_feed()`, toutes les 10 min)

```
gov_client.fetch_live()       # flux-instantane-v2 (quelques milliers de prix récents)
  → parse_live_records()
  → ES update_by_query        # patch champ fuels uniquement, pas de ré-indexation
```

### Refresh post-search (`schedule_refresh()`)

Après chaque réponse `/recommend`, les stations périmées sont re-fetchées silencieusement :
- `_is_gov_stale()` : `gov_last_updated > gov_refresh_hours` (défaut 6h)
- `_is_osm_stale()` : `osm_last_updated > osm_refresh_days` (défaut 7j)

---

## 5. Moteur de scoring

### Mode "Nearby"

| Critère | Poids | Calcul |
|---------|-------|--------|
| Prix | 40% | `gap = price - min_price` ; zéro si gap ≥ 1.00 €/L |
| Distance | 30% | Haversine vs. rayon demandé |
| Fraîcheur | 20% | 1.0 si < 1h → linéaire → 0.0 à 168h |
| Services | 10% | Ouvert 0.35 + CB 0.30 + Boutique 0.20 + Lavage 0.10 + Toilettes 0.05 |

### Mode "Route"

| Critère | Poids |
|---------|-------|
| Prix | 60% |
| Détour (`detour_km`) | 25% |
| Fraîcheur | 10% |
| Services | 5% |

Free zone détour : ≤ 3% de la longueur du trajet = score 100.

### Labels de recommandation (top-3)

Générés par `scoring_service` selon le critère dominant : "Meilleur prix", "Moins de détour", "Mieux équipée", "Bon compromis prix / détour", "Données fraîches", "Sans détour"…

---

## 6. API Backend — endpoints

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/v1/stations/search` | — | Recherche brute par rayon geo |
| GET | `/api/v1/stations/recommend` | — | Recommandation scorée nearby |
| GET | `/api/v1/stations/route-recommend` | — | Stations sur un itinéraire OSRM |
| GET | `/api/v1/stations/{id}` | — | Détail d'une station |
| GET | `/api/v1/stations/{id}/history` | — | Historique de prix |
| POST | `/api/v1/ingestion/trigger` | X-API-Key | Déclenche ingestion manuelle |
| GET | `/api/v1/ingestion/status` | — | État de l'ingestion (polling) |
| GET | `/health` | — | Health check |

Rate-limit SlowAPI par IP : `RATE_LIMIT_PER_MINUTE` (défaut 60). Toutes les routes sont tracées OTel si `OTEL_ENABLED=true`.

---

## 7. Frontend — architecture signal Angular

### AppStateService — source de vérité

```typescript
// Signaux principaux
mode: Signal<'nearby' | 'route'>
filters: Signal<FilterValues>
sortBy: Signal<SortBy>          // 'score' | 'price' | 'distance' | 'freshness'
_allStations: Signal<Station[]>

// Computed dérivés
displayedStations = computed(() => _sortStations(_allStations(), sortBy(), false))
top3              = computed(() => displayedStations().slice(0, 3))
otherStations     = computed(() => displayedStations().slice(3))
routeStations     = computed(() => _sortStations(routeData()?.stations ?? [], sortBy(), true))
```

Tri côté client `_sortStations()` :
- `score` → `station.score` décroissant
- `price` → `matched_fuel.price` croissant
- `distance` → `distance_meters` (nearby) ou `_route_info.detour_km` (route)
- `freshness` → `matched_fuel.updated_at` décroissant

### AppComponent — layout

**Desktop** : sidebar 380px fixe à gauche + `map-area` flex:1.
**Mobile** : carte plein écran absolu + bottom sheet 3 snaps (`sheetSnap: Signal<0|1|2>`) :
- Snap 0 : peek 80px
- Snap 1 : half 48vh
- Snap 2 : full

Topbar mobile glassmorphism : `backdrop-filter: blur(20px) saturate(1.8)` + `rgba(255,255,255,0.92)`.

Sort bar desktop : entre la recherche d'adresse et les filtres.
Sort bar mobile : apparaît entre le sheet-handle et le body quand des résultats existent.

**Règle Angular** : effets qui écrivent dans un signal → `{ allowSignalWrites: true }`.

### MapComponent — Leaflet

- `ngAfterViewInit` → `setTimeout(0)` puis `invalidateSize()` (dimensions CSS pas encore finales)
- `ResizeObserver` sur le conteneur → `invalidateSize()` automatique à chaque redimensionnement
- Diff markers par `station.id` : pas de reconstruction globale sur chaque refresh
- Cleanup : `ResizeObserver.disconnect()` + `map.remove()` dans `ngOnDestroy()`
- Markers top-3 : cercles 48px gradient amber `linear-gradient(135deg, #F59E0B, #D97706)`
- Markers standard : labels prix fond `--color-surface`, bordure `--color-primary`
- Marker hover : `scale(1.20)` + ring `--color-primary`

### Design system

Police : **Plus Jakarta Sans** (Google Fonts — non inlinée en prod).
Primaire : `#0284C7` (sky-blue) · Accent : `#D97706` (amber).

Tokens CSS dans `styles.scss` :
- 4 niveaux de surface (`--color-surface` à `--color-surface-raised`)
- 4 niveaux d'ombre avec tint sky-blue (`--shadow-sm/md/lg/xl`)
- `--shadow-sheet` pour le bottom sheet
- Radius : `--radius-sm` (8px) à `--radius-2xl` (24px) + `--radius-pill` (100px)
- Dark mode complet via `@media (prefers-color-scheme: dark)` sur `:root`
- `@media (prefers-reduced-motion: reduce)` : toutes les animations désactivées

CSP Nginx : `style-src` inclut `fonts.googleapis.com` · `font-src` inclut `fonts.gstatic.com`.

---

## 8. Configuration `.env` — toutes les variables

```bash
# Ports hôte
FRONTEND_PORT=4200
BACKEND_PORT=8000

# Elasticsearch
ELASTICSEARCH_URL=http://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=          # REQUIRED
ELASTICSEARCH_VERIFY_CERTS=false # true en prod avec TLS

# Sécurité
CORS_ALLOWED_ORIGINS=http://localhost:4200
RATE_LIMIT_PER_MINUTE=60
INGESTION_API_KEY=               # REQUIRED pour /ingestion/trigger
ENABLE_DOCS=true                 # false en production

# Application
LOG_LEVEL=INFO

# OpenTelemetry
OTEL_ENABLED=false
OTEL_EXPORTER_TYPE=otlp          # otlp | console
OTEL_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_OTLP_HEADERS=               # "Authorization=Bearer xxx,X-Tenant=myorg"
OTEL_SERVICE_NAME=prix-pompe-api

# Planification
INGESTION_SCHEDULE=0 11 * * *
LIVE_FEED_SCHEDULE=*/10 * * * *

# Rétention
OSM_REFRESH_DAYS=7
PRICE_HISTORY_DAYS=30
```

---

## 9. Graphify — carte du code (2026-05-01)

### God nodes (nœuds les plus connectés)

| Node | Edges | Rôle |
|------|-------|------|
| `MapComponent` | 23 | Carte Leaflet, markers, interactions |
| `PriceHistoryComponent` | 21 | Graphique SVG historique prix |
| `AppComponent` | 19 | Shell coordinateur |
| `AppStateService` | 18 | Source de vérité signals |
| `StationCardComponent` | 16 | Card résultat station |
| `RoutePanelComponent` | 12 | Formulaire itinéraire |
| `run_live_feed()` | 10 | Worker live feed |
| `FiltersComponent` | 9 | Filtres UI |

### 32 communautés détectées

| Communauté | Nœuds clés |
|-----------|-----------|
| Address Search & Geocoding UI | `AddressSearchComponent`, `AppComponent`, `AppStateService` |
| Backend Config & ES Client | `Settings`, `ensure_index()`, `STATION_MAPPING`, `get_es_client()` |
| Scoring Engine | `haversine_km()`, `_fraicheur_score()`, `_services_score()`, `_best_fuel()` |
| Data Ingestion Pipeline | `run_ingestion()`, `_cleanup_old_history()`, `_index_history()` |
| App Lifecycle & Live Feed | `run_live_feed()`, `live_feed_state`, `IngestionState` |
| Stations API & Staleness Refresh | `schedule_refresh()`, `_is_gov_stale()`, `_patch_station()` |
| OSM Enrichment | `build_spatial_index()`, `cross_reference()`, `nearest_osm()` |
| Opening Hours Parser | `is_open_now()`, `format_opening_hours()`, `_expand_days()` |
| Brand Utils & Station Card | `brandInitial()`, `safeBrandColor()`, `StationCardComponent` |
| Scoring Tests | Tests purs Python, aucune dépendance externe |
| Route Planning UI | `RoutePanelComponent`, formulaire départ/arrivée |
| Leaflet Map Component | `MapComponent`, `_diffMarkers()`, `_buildIcon()` |
| Price History Chart | `PriceHistoryComponent`, courbe Catmull-Rom SVG |

### Pipelines hyperedges (relations multi-nœuds)

- **Frontend Display Pipeline** : `AppStateService` → `MapComponent` → `StationCardComponent` → `PriceHistoryComponent`
- **Backend Price Refresh Pipeline** : `schedule_refresh()` → `_refresh_station()` → `gov_client.fetch_by_ids()` → `INDEX_NAME`
- **Live Feed Pipeline** : `run_live_feed()` → `fetch_live()` → `parse_live_records()` → `live_feed_state` → `INDEX_NAME`
- **Station Recommendation Flow** : `recommend_stations()` → `route_recommend()` → `search_stations()` → `schedule_refresh()`

### Connexions surprenantes (INFERRED — à vérifier)

- `AppComponent` → `get_ingestion_status` endpoint (via `IngestionStatusService`)
- `route_recommend()` → `INDEX_NAME` (référence directe sans passer par `station_service`)
- `_refresh_gov()` → `INDEX_NAME` (bypass `station_service`)
- `get_price_history()` → `HISTORY_INDEX` (référence directe)

### Nœuds isolés connus (85 nœuds ≤1 connexion)

`main.py` (middlewares), `telemetry.py`, `IngestionStatusService`, `StationCacheService`, `GeocodingService`, `GeolocationService` — feuilles fonctionnelles, pas des lacunes architecturales.

---

## 10. Conventions de code

### Backend Python

- Zéro secret hardcodé — tout via `settings.*`
- Erreurs de routing sanitisées : `"Routing service unavailable"` pas l'exception brute
- Erreur `/ingestion/status` : message générique en prod (pas le traceback)
- OTel : `if not enabled: return None` avant tout import SDK (zero-overhead quand désactivé)
- `aiohttp` obligatoire dans `requirements.txt` — dépendance implicite de `elasticsearch[async]`

### Frontend Angular

- `ChangeDetectionStrategy.OnPush` sur tous les composants
- Signals + `computed()` pour les valeurs dérivées — pas de getters
- Effets écrivant dans un signal : `{ allowSignalWrites: true }` obligatoire
- `brand_color` : toujours passer par `safeBrandColor()` avant injection `[style.background]`
- Subscriptions RxJS : `takeUntilDestroyed(this.destroyRef)` obligatoire
- Leaflet : `ResizeObserver` + `setTimeout(0)` + `invalidateSize()` — pattern validé

### CSS

- Toutes les couleurs via tokens `--color-*` de `styles.scss`
- Dark mode uniquement via `@media (prefers-color-scheme: dark)` sur `:root`
- Budget Angular : `anyComponentStyle` max 32kb (`angular.json`)
- `optimization.fonts.inline: false` dans `angular.json` (police Google Fonts externe)

---

## 11. Commandes utiles

```bash
# Lancer l'application complète
sudo docker compose up -d

# Rebuild après modif Dockerfile ou nginx
sudo docker compose up --build -d

# Frontend dev server (hot reload)
cd frontend && npx ng serve

# Build prod Angular (vérifie TS + budgets)
cd frontend && npx ng build --configuration=production

# Tests backend
cd backend && python -m pytest tests/ -v

# Graphify — mise à jour graphe après modifications code (AST, pas de coût API)
graphify update .
```

---

## 12. Décisions architecturales actées

| Décision | Raison |
|----------|--------|
| Tri côté client (`_sortStations()`) | Évite un round-trip API ; données déjà en mémoire dans `AppStateService` |
| Score calculé côté backend | Accès à `min_price` de la zone nécessaire pour la normalisation |
| OTLP HTTP port 4318 (pas gRPC 4317) | Pas de dépendance `grpcio` lourde |
| `ResizeObserver` + `setTimeout(0)` sur Leaflet | La sidebar qui s'ouvre redimensionne le conteneur sans que Leaflet le sache |
| Live feed séparé de l'ingestion complète | L'ingestion ~74k stations + OSM est trop lourde pour toutes les 10 min |
| `PRICE_HISTORY_DAYS=30` | Compromis utilité des tendances vs. taille index ES |
| `aiohttp` maintenu dans `requirements.txt` | Dépendance implicite de `elasticsearch[async]` (suppression → crash au démarrage) |
| Bottom sheet 3 snaps (80px/48vh/full) | Permet de voir la carte tout en ayant accès aux résultats en peek |
| Sort bar desktop entre recherche et filtres | Logique de lecture : on cherche → on trie → on filtre |
| Sort bar mobile apparaît uniquement si résultats | Pas de bruit UI quand il n'y a rien à trier |

---

## 13. Roadmap / idées futures

- **Alertes prix** : notification push si prix station préférée baisse sous un seuil
- **Prédiction de tendance** : médiane mobile 7j → flèche montante/descendante/stable
- **ILM Elasticsearch** : politique de rétention automatique sur `fuel-price-history`
- **Historique adresses** : localStorage pour les dernières recherches
- **Backup ES** : script `scripts/es-snapshot.sh` + procédure documentée
- **Auth multi-tenant** : plusieurs clés API avec quotas différenciés
- **PWA / offline** : service worker pour cacher les dernières stations

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
