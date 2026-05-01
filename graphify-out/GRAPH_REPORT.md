# Graph Report - .  (2026-05-01)

## Corpus Check
- Corpus is ~31,016 words - fits in a single context window. You may not need a graph.

## Summary
- 425 nodes · 537 edges · 32 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Address Search & Geocoding UI|Address Search & Geocoding UI]]
- [[_COMMUNITY_Backend Config & ES Client|Backend Config & ES Client]]
- [[_COMMUNITY_Project Architecture & CLAUDE|Project Architecture & CLAUDE.md]]
- [[_COMMUNITY_Scoring Tests|Scoring Tests]]
- [[_COMMUNITY_Stations API & Staleness Refresh|Stations API & Staleness Refresh]]
- [[_COMMUNITY_App Lifecycle & Live Feed|App Lifecycle & Live Feed]]
- [[_COMMUNITY_Data Ingestion Pipeline|Data Ingestion Pipeline]]
- [[_COMMUNITY_Price History Chart|Price History Chart]]
- [[_COMMUNITY_Leaflet Map Component|Leaflet Map Component]]
- [[_COMMUNITY_OSM Enrichment Service|OSM Enrichment Service]]
- [[_COMMUNITY_Brand Utils & Station Card|Brand Utils & Station Card]]
- [[_COMMUNITY_Scoring Engine|Scoring Engine]]
- [[_COMMUNITY_Config Tests|Config Tests]]
- [[_COMMUNITY_API Tests|API Tests]]
- [[_COMMUNITY_Opening Hours Parser|Opening Hours Parser]]
- [[_COMMUNITY_Route Planning UI|Route Planning UI]]
- [[_COMMUNITY_Routing Service|Routing Service]]
- [[_COMMUNITY_Filters Component|Filters Component]]
- [[_COMMUNITY_Station Data Models|Station Data Models]]
- [[_COMMUNITY_Ingestion Status Polling|Ingestion Status Polling]]
- [[_COMMUNITY_Station Cache (Frontend)|Station Cache (Frontend)]]
- [[_COMMUNITY_Backend Station Service|Backend Station Service]]
- [[_COMMUNITY_Frontend Station Service|Frontend Station Service]]
- [[_COMMUNITY_Brand Logos & Colors|Brand Logos & Colors]]
- [[_COMMUNITY_Ingestion Tests|Ingestion Tests]]
- [[_COMMUNITY_Price History Service|Price History Service]]
- [[_COMMUNITY_Geocoding Service|Geocoding Service]]
- [[_COMMUNITY_Frontend Routing Service|Frontend Routing Service]]
- [[_COMMUNITY_Navigation Utilities|Navigation Utilities]]
- [[_COMMUNITY_Geolocation Service|Geolocation Service]]
- [[_COMMUNITY_Ingestion Trigger Endpoint|Ingestion Trigger Endpoint]]
- [[_COMMUNITY_ES Price History Mapping|ES Price History Mapping]]

## God Nodes (most connected - your core abstractions)
1. `MapComponent` - 23 edges
2. `PriceHistoryComponent` - 21 edges
3. `AppComponent` - 19 edges
4. `AppStateService` - 18 edges
5. `StationCardComponent` - 16 edges
6. `RoutePanelComponent` - 12 edges
7. `_base_env()` - 11 edges
8. `run_live_feed()` - 10 edges
9. `FiltersComponent` - 9 edges
10. `AddressSearchComponent` - 8 edges

## Surprising Connections (you probably didn't know these)
- `AppComponent` --calls--> `get_ingestion_status endpoint`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/frontend/src/app/app.component.ts → backend/app/api/ingestion.py
- `route_recommend()` --references--> `INDEX_NAME fuel-stations`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/app/api/stations.py → backend/app/services/elasticsearch_client.py
- `_refresh_gov()` --references--> `INDEX_NAME fuel-stations`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/app/workers/refresh.py → backend/app/services/elasticsearch_client.py
- `get_price_history()` --references--> `HISTORY_INDEX fuel-price-history`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/app/api/stations.py → backend/app/services/elasticsearch_client.py
- `IngestionState` --implements--> `ingestion_state singleton`  [EXTRACTED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/app/services/ingestion_state.py → backend/app/services/ingestion_state.py

## Hyperedges (group relationships)
- **Frontend Station Display Pipeline** — app_state_service_appstateservice, map_component_mapcomponent, station_card_component_stationcardcomponent, price_history_component_pricehistorycomponent [INFERRED 0.85]
- **Backend Price Refresh Pipeline** — refresh_schedule_refresh, refresh_refresh_station, refresh_refresh_gov, gov_client_fetch_by_ids, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Live Feed Update Pipeline** — live_feed_run_live_feed, gov_client_fetch_live, gov_client_parse_live_records, ingestion_state_live_feed_state, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Station Recommendation & Scoring Flow** — stations_recommend_stations, stations_route_recommend, stations_search_stations, refresh_schedule_refresh [EXTRACTED 0.90]

## Communities

### Community 0 - "Address Search & Geocoding UI"
Cohesion: 0.07
Nodes (3): AddressSearchComponent, AppComponent, AppStateService

### Community 1 - "Backend Config & ES Client"
Cohesion: 0.08
Nodes (25): BaseSettings, Application settings — all values come from environment variables or .env file., Return CORS origins as a list., Settings, ensure_index(), get_es_client(), STATION_MAPPING, fetch_all() (+17 more)

### Community 2 - "Project Architecture & CLAUDE.md"
Cohesion: 0.08
Nodes (29): Backend (Python/FastAPI), data_confidence_score, data.gouv.fr fuel price dataset, Decision Engine, Docker / docker-compose, Elasticsearch, .env configuration, Frontend (Angular/Leaflet) (+21 more)

### Community 3 - "Scoring Tests"
Cohesion: 0.12
Nodes (15): _make_route_station(), _make_station(), Unit tests for the scoring service.  No external dependencies — pure Python, no, test_cheapest_station_gets_highest_price_score(), test_closest_station_gets_highest_distance_score(), test_fraicheur_at_168h_is_0(), test_fraicheur_at_84h_is_half(), test_fraicheur_fresh_data_is_1() (+7 more)

### Community 4 - "Stations API & Staleness Refresh"
Cohesion: 0.14
Nodes (21): HISTORY_INDEX fuel-price-history, _is_gov_stale(), _is_osm_stale(), _patch_station(), Background Station Refresh =========================== Triggered after each sear, Re-fetch metadata from OSM and patch ES., Refresh a single station from its stale sources., Entry point called after each search response.      Filters stations that need r (+13 more)

### Community 5 - "App Lifecycle & Live Feed"
Cohesion: 0.12
Nodes (13): INDEX_NAME fuel-stations, get_ingestion_status endpoint, ingestion_state singleton, IngestionState, live_feed_state singleton, In-memory ingestion state tracker.  Provides a single source of truth for the cu, Live Feed Worker ================ Polls the prix-carburants-flux-instantane-v2 d, Fetch the live price feed and patch Elasticsearch with updated fuel prices. (+5 more)

### Community 6 - "Data Ingestion Pipeline"
Cohesion: 0.11
Nodes (19): _cleanup_old_history(), debug_index(), _finalise(), get_ingestion_status(), _index_history(), Ingestion endpoints.  All mutating endpoints require a valid API key passed as t, Delete history records older than keep_days. Returns deleted count., Dependency that validates the X-API-Key header.     - If INGESTION_API_KEY is no (+11 more)

### Community 7 - "Price History Chart"
Cohesion: 0.14
Nodes (1): PriceHistoryComponent

### Community 8 - "Leaflet Map Component"
Cohesion: 0.19
Nodes (1): MapComponent

### Community 9 - "OSM Enrichment Service"
Cohesion: 0.17
Nodes (18): build_spatial_index(), _cell(), cross_reference(), extract_osm_fields(), fetch_all_france(), fetch_by_osm_id(), _haversine_m(), nearest_osm() (+10 more)

### Community 10 - "Brand Utils & Station Card"
Cohesion: 0.15
Nodes (3): brandInitial(), safeBrandColor(), StationCardComponent

### Community 11 - "Scoring Engine"
Cohesion: 0.22
Nodes (13): _best_fuel(), _fraicheur_score(), haversine_km(), Scoring and recommendation service for fuel stations. Rates stations 0-100 combi, Return the great-circle distance in km between two points., Scoring rules for route mode:       price   60% — cheapest = 100, gap ≥ 1.00 €/L, Return 0.0-1.0 fraîcheur: 1.0 si < 1h, décroit linéairement jusqu'à 0 à 168h (7, Return 0.0-1.0 score based on available services. (+5 more)

### Community 12 - "Config Tests"
Cohesion: 0.24
Nodes (12): _base_env(), Tests for configuration validation.  Verifies that the application fails fast wi, Return a minimal valid env dict., test_cors_origins_empty_raises(), test_cors_origins_parsed_correctly(), test_cors_origins_single(), test_ingestion_api_key_defaults_to_empty(), test_log_level_invalid_raises() (+4 more)

### Community 13 - "API Tests"
Cohesion: 0.15
Nodes (6): _make_station(), API endpoint tests.  These tests use ASGI transport (no real server) and mock El, Correct API key → ingestion is accepted (background task, status 200)., Return a minimal valid station dict., test_ingestion_trigger_correct_key_accepted(), test_search_returns_results()

### Community 14 - "Opening Hours Parser"
Cohesion: 0.21
Nodes (11): _expand_days(), format_opening_hours(), is_open_now(), _parse_time(), Opening Hours Parser ==================== Parses the OSM `opening_hours` tag to, Return True if the station is currently open, False if closed,     None if the f, Return a display-friendly version of the opening_hours string., Mo-Fr' → [0,1,2,3,4]  |  'Sa' → [5]  |  'Mo,We,Fr' → [0,2,4] (+3 more)

### Community 15 - "Route Planning UI"
Cohesion: 0.2
Nodes (1): RoutePanelComponent

### Community 16 - "Routing Service"
Cohesion: 0.24
Nodes (10): filter_stations_near_route(), get_route(), _haversine_km(), _project_point_to_segment(), Routing service: fetches route geometry from OSRM and provides helpers to filter, Returns stations whose detour_km <= max_detour_km,     each enriched with _route, Returns:     {         "coordinates": [[lon, lat], ...],  # GeoJSON order, Projects point (px,py) onto segment (ax,ay)-(bx,by).     Returns (closest_x, clo (+2 more)

### Community 17 - "Filters Component"
Cohesion: 0.31
Nodes (1): FiltersComponent

### Community 18 - "Station Data Models"
Cohesion: 0.48
Nodes (6): BaseModel, FuelPrice, GeoPoint, SearchParams, Station, StationSearchResult

### Community 19 - "Ingestion Status Polling"
Cohesion: 0.47
Nodes (1): IngestionStatusService

### Community 20 - "Station Cache (Frontend)"
Cohesion: 0.4
Nodes (2): haversineKm(), StationCacheService

### Community 21 - "Backend Station Service"
Cohesion: 0.47
Nodes (4): get_station_by_id(), Map an ES _source dict to StationSearchResult, recomputing is_open live., search_stations(), _to_result()

### Community 22 - "Frontend Station Service"
Cohesion: 0.4
Nodes (1): StationService

### Community 23 - "Brand Logos & Colors"
Cohesion: 0.4
Nodes (1): Brand Logos =========== Maps normalized brand keys (from osm_enrichment._normali

### Community 24 - "Ingestion Tests"
Cohesion: 0.6
Nodes (3): make_raw_station(), test_parse_station_basic(), test_parse_station_missing_coordinates()

### Community 25 - "Price History Service"
Cohesion: 0.5
Nodes (1): PriceHistoryService

### Community 26 - "Geocoding Service"
Cohesion: 0.5
Nodes (1): GeocodingService

### Community 27 - "Frontend Routing Service"
Cohesion: 0.5
Nodes (1): RoutingService

### Community 28 - "Navigation Utilities"
Cohesion: 1.0
Nodes (2): openRoute(), routeUrl()

### Community 29 - "Geolocation Service"
Cohesion: 0.67
Nodes (1): GeolocationService

### Community 45 - "Ingestion Trigger Endpoint"
Cohesion: 1.0
Nodes (1): trigger_ingestion endpoint

### Community 46 - "ES Price History Mapping"
Cohesion: 1.0
Nodes (1): HISTORY_MAPPING

## Knowledge Gaps
- **85 isolated node(s):** `Application settings — all values come from environment variables or .env file.`, `Return CORS origins as a list.`, `Application entry point.  Security measures implemented here: - CORS: restricted`, `Run a full ingestion at startup if the index is empty or missing.     Retries up`, `Filter stations (model or dict) so that each requested service appears in the st` (+80 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Price History Chart`** (19 nodes): `price-history.component.ts`, `PriceHistoryComponent`, `.brandInitial()`, `.catmullRomPath()`, `.chartAriaLabel()`, `.formatDate()`, `.formatShortDate()`, `.midPrice()`, `.ngOnInit()`, `.pointX()`, `.pointY()`, `.pts()`, `.px()`, `.py()`, `.shouldShowXLabel()`, `.smoothAreaPath()`, `.smoothLinePath()`, `.tooltipLeft()`, `.trendLabel()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Leaflet Map Component`** (19 nodes): `map.component.ts`, `MapComponent`, `._applyHover()`, `._buildIcon()`, `._centerOnUser()`, `._createMarker()`, `._diffMarkers()`, `.formatDistance()`, `.formatFuelDate()`, `.hoveredStationId()`, `._initMap()`, `.isFuelHighlighted()`, `.ngAfterViewInit()`, `.ngOnChanges()`, `.ngOnDestroy()`, `.onPanelLogoError()`, `._refreshAllIcons()`, `._updateRoutePolyline()`, `._updateSelectionMarkers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Route Planning UI`** (11 nodes): `route-panel.component.ts`, `RoutePanelComponent`, `.canSubmit()`, `.clear()`, `.constructor()`, `.ngOnChanges()`, `.onDestChange()`, `.onOriginChange()`, `.submit()`, `.swapFields()`, `._watchField()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Filters Component`** (10 nodes): `FiltersComponent`, `.clearPrice()`, `.currentFuelNote()`, `.emit()`, `.isServiceSelected()`, `.onMaxPriceChange()`, `.reset()`, `.selectFuel()`, `.toggleService()`, `filters.component.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Ingestion Status Polling`** (6 nodes): `ingestion-status.service.ts`, `IngestionStatusService`, `.ngOnDestroy()`, `._poll()`, `.startPolling()`, `._stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Station Cache (Frontend)`** (6 nodes): `station-cache.service.ts`, `haversineKm()`, `StationCacheService`, `.filterStations()`, `.getStations()`, `.invalidate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Station Service`** (5 nodes): `station.service.ts`, `StationService`, `.getStation()`, `.recommendStations()`, `.searchStations()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Brand Logos & Colors`** (5 nodes): `get_brand_color()`, `get_display_name()`, `get_logo_url()`, `Brand Logos =========== Maps normalized brand keys (from osm_enrichment._normali`, `brand_logos.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Price History Service`** (4 nodes): `price-history.service.ts`, `PriceHistoryService`, `._buildFuelHistory()`, `.getHistory()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Geocoding Service`** (4 nodes): `GeocodingService`, `.reverseGeocode()`, `.search()`, `geocoding.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Routing Service`** (4 nodes): `routing.service.ts`, `RoutingService`, `.exportToGoogleMaps()`, `.getRouteRecommendations()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Navigation Utilities`** (3 nodes): `navigation.util.ts`, `openRoute()`, `routeUrl()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Geolocation Service`** (3 nodes): `GeolocationService`, `.getCurrentPosition()`, `geolocation.service.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Ingestion Trigger Endpoint`** (1 nodes): `trigger_ingestion endpoint`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ES Price History Mapping`** (1 nodes): `HISTORY_MAPPING`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppComponent` connect `Address Search & Geocoding UI` to `App Lifecycle & Live Feed`, `Price History Chart`, `Leaflet Map Component`, `Brand Utils & Station Card`, `Route Planning UI`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `AppStateService` connect `Address Search & Geocoding UI` to `Backend Config & ES Client`, `Brand Utils & Station Card`, `Stations API & Staleness Refresh`, `Route Planning UI`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `Settings` connect `Backend Config & ES Client` to `Address Search & Geocoding UI`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `PriceHistoryComponent` (e.g. with `StationCardComponent` and `get_price_history()`) actually correct?**
  _`PriceHistoryComponent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `AppStateService` (e.g. with `StationCardComponent` and `RoutePanelComponent`) actually correct?**
  _`AppStateService` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `StationCardComponent` (e.g. with `AppStateService` and `PriceHistoryComponent`) actually correct?**
  _`StationCardComponent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Application settings — all values come from environment variables or .env file.`, `Return CORS origins as a list.`, `Application entry point.  Security measures implemented here: - CORS: restricted` to the rest of the system?**
  _85 weakly-connected nodes found - possible documentation gaps or missing edges._