# Graph Report - Pump-price  (2026-06-25)

## Corpus Check
- 56 files · ~31,128 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 434 nodes · 612 edges · 24 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 119 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `MapComponent` - 21 edges
2. `PriceHistoryComponent` - 20 edges
3. `AppStateService` - 18 edges
4. `Settings` - 16 edges
5. `StationCardComponent` - 15 edges
6. `score_stations()` - 14 edges
7. `AppComponent` - 14 edges
8. `_run_ingestion_inner()` - 11 edges
9. `_base_env()` - 11 edges
10. `RoutePanelComponent` - 11 edges

## Surprising Connections (you probably didn't know these)
- `PriceHistoryComponent` --calls--> `get_price_history()`  [INFERRED]
  frontend\src\app\components\price-history\price-history.component.ts → backend\app\api\stations.py
- `Tests for configuration validation.  Verifies that the application fails fast wi` --uses--> `Settings`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/tests/test_config.py → backend\app\config.py
- `Return a minimal valid env dict.` --uses--> `Settings`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/tests/test_config.py → backend\app\config.py
- `test_settings_missing_password_raises()` --calls--> `Settings`  [INFERRED]
  backend\tests\test_config.py → backend\app\config.py
- `AppStateService` --conceptually_related_to--> `Settings`  [INFERRED]
  frontend\src\app\services\app-state.service.ts → backend\app\config.py

## Hyperedges (group relationships)
- **Frontend Station Display Pipeline** — app_state_service_appstateservice, map_component_mapcomponent, station_card_component_stationcardcomponent, price_history_component_pricehistorycomponent [INFERRED 0.85]
- **Backend Price Refresh Pipeline** — refresh_schedule_refresh, refresh_refresh_station, refresh_refresh_gov, gov_client_fetch_by_ids, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Live Feed Update Pipeline** — live_feed_run_live_feed, gov_client_fetch_live, gov_client_parse_live_records, ingestion_state_live_feed_state, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Station Recommendation & Scoring Flow** — stations_recommend_stations, stations_route_recommend, stations_search_stations, refresh_schedule_refresh [EXTRACTED 0.90]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (31): close_es(), get_es(), ensure_history_index(), ensure_index(), get_es_client(), _cleanup_old_history(), debug_index(), get_ingestion_status() (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (5): AddressSearchComponent, AppComponent, AppStateService, GeolocationService, RoutingService

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (37): _best_fuel(), _fraicheur_score(), haversine_km(), Scoring and recommendation service for fuel stations. Rates stations 0-100 combi, Return the great-circle distance in km between two points., Scoring rules for route mode:       price   60% — cheapest = 100, gap ≥ 1.00 €/L, Return 0.0-1.0 fraîcheur: 1.0 si < 1h, décroit linéairement jusqu'à 0 à 168h (7, Return 0.0-1.0 score based on available services. (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (29): get_brand_color(), get_logo_url(), Brand Logos =========== Maps normalized brand keys (from osm_enrichment._normali, _finalise(), Compute derived display fields after cross-reference., _expand_days(), format_opening_hours(), is_open_now() (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (20): BaseModel, GeocodingService, FuelPrice, GeoPoint, SearchParams, get_price_history(), get_station_by_id(), Map an ES _source dict to StationSearchResult, recomputing is_open live. (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (26): Backend (Python/FastAPI), data_confidence_score, data.gouv.fr fuel price dataset, Decision Engine, Docker / docker-compose, Elasticsearch, .env configuration, Frontend (Angular/Leaflet) (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (2): PriceHistoryComponent, PriceHistoryService

### Community 7 - "Community 7"
Cohesion: 0.2
Nodes (17): BaseSettings, Application settings — all values come from environment variables or .env file., Return CORS origins as a list., Settings, _base_env(), Tests for configuration validation.  Verifies that the application fails fast wi, Return a minimal valid env dict., test_cors_origins_empty_raises() (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (4): safeBrandColor(), openRoute(), routeUrl(), StationCardComponent

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (2): FiltersComponent, RoutePanelComponent

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (18): build_spatial_index(), _cell(), cross_reference(), extract_osm_fields(), fetch_all_france(), fetch_by_osm_id(), _haversine_m(), nearest_osm() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (1): MapComponent

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (15): fetch_all(), fetch_by_ids(), fetch_live(), _fmt_time(), _parse_horaires(), _parse_live_records(), parse_records_to_stations(), Government Data Client (data.economie.gouv.fr) ================================= (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.15
Nodes (6): _make_station(), API endpoint tests.  These tests use ASGI transport (no real server) and mock El, Correct API key → ingestion is accepted (background task, status 200)., Return a minimal valid station dict., test_ingestion_trigger_correct_key_accepted(), test_search_returns_results()

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (10): filter_stations_near_route(), get_route(), _haversine_km(), _project_point_to_segment(), Routing service: fetches route geometry from OSRM and provides helpers to filter, Returns stations whose detour_km <= max_detour_km,     each enriched with _route, Returns:     {         "coordinates": [[lon, lat], ...],  # GeoJSON order, Projects point (px,py) onto segment (ax,ay)-(bx,by).     Returns (closest_x, clo (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (3): haversineKm(), StationCacheService, StationService

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (7): instrument_fastapi(), _parse_headers(), OpenTelemetry setup — traces, metrics, logs via OTLP HTTP.  Activated only whe, Attach FastAPI auto-instrumentation (traces on every route)., Parse 'Key=Value,Key2=Value2' into a dict., Configure OTel SDK.  Returns a LoggingHandler to attach to the root logger,, setup_telemetry()

### Community 17 - "Community 17"
Cohesion: 0.43
Nodes (1): IconComponent

### Community 18 - "Community 18"
Cohesion: 0.47
Nodes (1): IngestionStatusService

### Community 19 - "Community 19"
Cohesion: 0.6
Nodes (3): make_raw_station(), test_parse_station_basic(), test_parse_station_missing_coordinates()

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): StationListComponent

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): SortBarComponent

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Return CORS origins as a list.

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Run a full ingestion at startup if the index is empty or missing.     Retries up

## Knowledge Gaps
- **82 isolated node(s):** `Application settings — all values come from environment variables or .env file.`, `Return CORS origins as a list.`, `Application entry point.  Security measures implemented here: - CORS: restricted`, `Run a full ingestion at startup if the index is empty or missing.     Retries u`, `Dependency that validates the X-API-Key header.     - If INGESTION_API_KEY is no` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 6`** (23 nodes): `price-history.component.ts`, `price-history.service.ts`, `PriceHistoryComponent`, `.brandInitial()`, `.catmullRomPath()`, `.chartAriaLabel()`, `.formatDate()`, `.formatShortDate()`, `.midPrice()`, `.ngOnInit()`, `.pointX()`, `.pointY()`, `.pts()`, `.px()`, `.py()`, `.shouldShowXLabel()`, `.smoothAreaPath()`, `.smoothLinePath()`, `.tooltipLeft()`, `.trendLabel()`, `PriceHistoryService`, `._buildFuelHistory()`, `.getHistory()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (21 nodes): `FiltersComponent`, `.clearPrice()`, `.currentFuelNote()`, `.emit()`, `.isServiceSelected()`, `.onMaxPriceChange()`, `.selectFuel()`, `.toggleService()`, `filters.component.ts`, `route-panel.component.ts`, `RoutePanelComponent`, `.canSubmit()`, `.clear()`, `.constructor()`, `.ngOnChanges()`, `.onDestChange()`, `.onOriginChange()`, `.submit()`, `.swapFields()`, `._watchField()`, `.onCardClick()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (19 nodes): `map.component.ts`, `MapComponent`, `._applyHover()`, `._buildIcon()`, `._centerOnUser()`, `._createMarker()`, `._diffMarkers()`, `.formatDistance()`, `.formatFuelDate()`, `.hoveredStationId()`, `._initMap()`, `.isFuelHighlighted()`, `.ngAfterViewInit()`, `.ngOnChanges()`, `.ngOnDestroy()`, `.onPanelLogoError()`, `._refreshAllIcons()`, `._updateRoutePolyline()`, `._updateSelectionMarkers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (7 nodes): `icon.component.ts`, `IconComponent`, `._build()`, `.constructor()`, `.name()`, `.size()`, `.strokeWidth()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (6 nodes): `ingestion-status.service.ts`, `IngestionStatusService`, `.ngOnDestroy()`, `._poll()`, `.startPolling()`, `._stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `station-list.component.ts`, `StationListComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `sort-bar.component.ts`, `SortBarComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Return CORS origins as a list.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Run a full ingestion at startup if the index is empty or missing.     Retries up`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppStateService` connect `Community 1` to `Community 8`, `Community 9`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.341) - this node is a cross-community bridge._
- **Why does `_to_result()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.302) - this node is a cross-community bridge._
- **Why does `is_open_now()` connect `Community 3` to `Community 0`, `Community 4`?**
  _High betweenness centrality (0.278) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `PriceHistoryComponent` (e.g. with `StationCardComponent` and `get_price_history()`) actually correct?**
  _`PriceHistoryComponent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `AppStateService` (e.g. with `RoutePanelComponent` and `StationCardComponent`) actually correct?**
  _`AppStateService` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `Settings` (e.g. with `Tests for configuration validation.  Verifies that the application fails fast wi` and `Return a minimal valid env dict.`) actually correct?**
  _`Settings` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `StationCardComponent` (e.g. with `PriceHistoryComponent` and `AppStateService`) actually correct?**
  _`StationCardComponent` has 2 INFERRED edges - model-reasoned connections that need verification._