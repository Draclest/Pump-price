# Graph Report - prix à la pompe  (2026-06-27)

## Corpus Check
- 67 files · ~41,225 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 527 nodes · 793 edges · 57 communities detected
- Extraction: 72% EXTRACTED · 28% INFERRED · 0% AMBIGUOUS · INFERRED: 224 edges (avg confidence: 0.71)
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]

## God Nodes (most connected - your core abstractions)
1. `Vehicle` - 23 edges
2. `Preferences` - 23 edges
3. `PriceHistoryComponent` - 22 edges
4. `MapComponent` - 21 edges
5. `AppStateService` - 21 edges
6. `StationCardComponent` - 19 edges
7. `Settings` - 19 edges
8. `AppComponent` - 16 edges
9. `search_net_gain()` - 15 edges
10. `score_stations()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `PriceHistoryComponent` --calls--> `get_price_history endpoint`  [INFERRED]
  frontend/src/app/components/price-history/price-history.component.ts → backend/app/api/stations.py
- `MapComponent` --shares_data_with--> `search_stations endpoint`  [INFERRED]
  frontend/src/app/components/map/map.component.ts → backend/app/api/stations.py
- `AppStateService` --conceptually_related_to--> `Settings`  [INFERRED]
  frontend/src/app/services/app-state.service.ts → backend/app/config.py
- `AppStateService` --calls--> `recommend_stations endpoint`  [INFERRED]
  frontend/src/app/services/app-state.service.ts → backend/app/api/stations.py
- `AppStateService` --calls--> `route_recommend endpoint`  [INFERRED]
  frontend/src/app/services/app-state.service.ts → backend/app/api/stations.py

## Hyperedges (group relationships)
- **Frontend Station Display Pipeline** — app_state_service_appstateservice, map_component_mapcomponent, station_card_component_stationcardcomponent, price_history_component_pricehistorycomponent [INFERRED 0.85]
- **Backend Price Refresh Pipeline** — refresh_schedule_refresh, refresh_refresh_station, refresh_refresh_gov, gov_client_fetch_by_ids, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Live Feed Update Pipeline** — live_feed_run_live_feed, gov_client_fetch_live, gov_client_parse_live_records, ingestion_state_live_feed_state, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Station Recommendation & Scoring Flow** — stations_recommend_stations, stations_route_recommend, stations_search_stations, refresh_schedule_refresh [EXTRACTED 0.90]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (47): compute_net_gain(), confidence_from_age(), GeoPointIn, NetGainBreakdown, NetGainInput, NetGainRequest, NetGainResult, Preferences (+39 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (5): AppComponent, AppStateService, GeolocationService, RoutingService, VehicleProfileService

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (37): _best_fuel(), _fraicheur_score(), haversine_km(), Scoring and recommendation service for fuel stations. Rates stations 0-100 combi, Return the great-circle distance in km between two points., Scoring rules for route mode:       price   60% — cheapest = 100, gap ≥ 1.00 €/L, Return 0.0-1.0 fraîcheur: 1.0 si < 1h, décroit linéairement jusqu'à 0 à 168h (7, Return 0.0-1.0 score based on available services. (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (30): get_brand_color(), get_logo_url(), Brand Logos =========== Maps normalized brand keys (from osm_enrichment._normali, ensure_index, STATION_MAPPING, fetch_all, fetch_by_ids, parse_records_to_stations (+22 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (25): _compute_detours(), _confidence_excluded(), _detour_fallback_radius(), _detour_fallback_route(), _km_to_bbox(), _km_to_min(), _median_price(), _prefilter_and_baseline() (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (3): FiltersComponent, RoutePanelComponent, VehicleProfileComponent

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (26): Backend (Python/FastAPI), data_confidence_score, data.gouv.fr fuel price dataset, Decision Engine, Docker / docker-compose, Elasticsearch, .env configuration, Frontend (Angular/Leaflet) (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (4): safeBrandColor, openRoute(), routeUrl(), StationCardComponent

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (3): HISTORY_INDEX fuel-price-history, PriceHistoryComponent, get_price_history endpoint

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (16): close_es(), get_es(), get_es_client, INDEX_NAME fuel-stations, fetch_live, _parse_live_records, get_ingestion_status endpoint, run_ingestion() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (17): BaseSettings, Application settings — all values come from environment variables or .env file., Return CORS origins as a list., Settings, _base_env(), Tests for configuration validation.  Verifies that the application fails fast wi, Return a minimal valid env dict., test_cors_origins_empty_raises() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.17
Nodes (15): GeocodingService, _age_minutes(), es_types_for(), _nested_fuel_query(), prefilter_bbox(), prefilter_radius(), Repository ES du moteur de gain net — étage 1 (préfiltre).  Réutilise l'index ex, Préfiltre géo (rayon) — modes nearby / habitual. (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (1): MapComponent

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (18): build_spatial_index(), _cell(), cross_reference(), extract_osm_fields(), fetch_all_france(), fetch_by_osm_id(), _haversine_m(), nearest_osm() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (16): BaseModel, schedule_refresh, FuelPrice, GeoPoint, SearchParams, get_station_by_id(), Map an ES _source dict to StationSearchResult, recomputing is_open live., _to_result() (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.14
Nodes (4): PriceHistoryService, haversineKm(), StationCacheService, StationService

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (6): _make_station(), API endpoint tests.  These tests use ASGI transport (no real server) and mock El, Correct API key → ingestion is accepted (background task, status 200)., Return a minimal valid station dict., test_ingestion_trigger_correct_key_accepted(), test_search_returns_results()

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (7): instrument_fastapi(), _parse_headers(), OpenTelemetry setup — traces, metrics, logs via OTLP HTTP.  Activated only whe, Attach FastAPI auto-instrumentation (traces on every route)., Parse 'Key=Value,Key2=Value2' into a dict., Configure OTel SDK.  Returns a LoggingHandler to attach to the root logger,, setup_telemetry()

### Community 18 - "Community 18"
Cohesion: 0.43
Nodes (1): IconComponent

### Community 19 - "Community 19"
Cohesion: 0.47
Nodes (1): IngestionStatusService

### Community 20 - "Community 20"
Cohesion: 0.6
Nodes (3): make_raw_station(), test_parse_station_basic(), test_parse_station_missing_coordinates()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (1): NetGainService

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): SortBarComponent

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): StationListComponent

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): AddressSearchComponent

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): brandInitial

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): stations router

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): ingestion router

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): trigger_ingestion endpoint

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): HISTORY_MAPPING

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Préfiltre géo (rayon) — modes nearby / habitual.

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Préfiltre par bounding box (corridor d'itinéraire) — mode route.      top_left =

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Station précise (prix + localisation du carburant ciblé) — baseline mode habitua

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Dependency that validates the X-API-Key header.     - If INGESTION_API_KEY is no

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Public endpoint — no authentication required.     Returns the current ingestion

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Trigger a full data ingestion in the background (non-blocking).

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Trigger a full data ingestion and wait for completion (blocking).

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Return index stats and a sample document to verify ingestion.

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Government Data Client (data.economie.gouv.fr) =================================

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): Convert '07.40' or '07:40' to '07:40'.

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Convert the gov 'horaires' JSON field to an OSM-format opening_hours string.

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Group raw records (one per station × fuel_type) into station dicts.      Each re

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): Parse the live feed format (one record per station, prices as columns).     Fiel

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Fetch the live feed (prix-des-carburants-en-france-flux-instantane-v2).     Upda

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): Fetch the full gov dataset (export endpoint, returns a flat JSON list of ~74k re

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): Fetch a subset of stations by their gov IDs.     Used for targeted price refresh

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): In-memory ingestion state tracker.  Provides a single source of truth for the cu

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): Live Feed Worker ================ Polls the prix-carburants-flux-instantane-v2 d

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): Fetch the live price feed and patch Elasticsearch with updated fuel prices.

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): Background Station Refresh =========================== Triggered after each sear

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): Partial update of a station document in ES.

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): Re-fetch prices from the gov API and patch ES.

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): Re-fetch metadata from OSM and patch ES.

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): Refresh a single station from its stale sources.

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): Entry point called after each search response.      Filters stations that need r

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): Return CORS origins as a list.

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): Run a full ingestion at startup if the index is empty or missing.     Retries up

## Knowledge Gaps
- **103 isolated node(s):** `SortBarComponent`, `AddressSearchComponent`, `StationListComponent`, `brandInitial`, `Application settings — all values come from environment variables or .env file.` (+98 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 12`** (19 nodes): `map.component.ts`, `MapComponent`, `._applyHover()`, `._buildIcon()`, `._centerOnUser()`, `._createMarker()`, `._diffMarkers()`, `.formatDistance()`, `.formatFuelDate()`, `.hoveredStationId()`, `._initMap()`, `.isFuelHighlighted()`, `.ngAfterViewInit()`, `.ngOnChanges()`, `.ngOnDestroy()`, `.onPanelLogoError()`, `._refreshAllIcons()`, `._updateRoutePolyline()`, `._updateSelectionMarkers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (7 nodes): `icon.component.ts`, `IconComponent`, `._build()`, `.constructor()`, `.name()`, `.size()`, `.strokeWidth()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (6 nodes): `ingestion-status.service.ts`, `IngestionStatusService`, `.ngOnDestroy()`, `._poll()`, `.startPolling()`, `._stop()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `net-gain.service.ts`, `NetGainService`, `.search()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `sort-bar.component.ts`, `SortBarComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `station-list.component.ts`, `StationListComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `AddressSearchComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `brandInitial`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `stations router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `ingestion router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `trigger_ingestion endpoint`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `HISTORY_MAPPING`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Préfiltre géo (rayon) — modes nearby / habitual.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Préfiltre par bounding box (corridor d'itinéraire) — mode route.      top_left =`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Station précise (prix + localisation du carburant ciblé) — baseline mode habitua`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Dependency that validates the X-API-Key header.     - If INGESTION_API_KEY is no`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Public endpoint — no authentication required.     Returns the current ingestion`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Trigger a full data ingestion in the background (non-blocking).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Trigger a full data ingestion and wait for completion (blocking).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Return index stats and a sample document to verify ingestion.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Government Data Client (data.economie.gouv.fr) =================================`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `Convert '07.40' or '07:40' to '07:40'.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `Convert the gov 'horaires' JSON field to an OSM-format opening_hours string.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `Group raw records (one per station × fuel_type) into station dicts.      Each re`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `Parse the live feed format (one record per station, prices as columns).     Fiel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Fetch the live feed (prix-des-carburants-en-france-flux-instantane-v2).     Upda`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `Fetch the full gov dataset (export endpoint, returns a flat JSON list of ~74k re`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `Fetch a subset of stations by their gov IDs.     Used for targeted price refresh`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `In-memory ingestion state tracker.  Provides a single source of truth for the cu`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `Live Feed Worker ================ Polls the prix-carburants-flux-instantane-v2 d`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `Fetch the live price feed and patch Elasticsearch with updated fuel prices.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `Background Station Refresh =========================== Triggered after each sear`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `Partial update of a station document in ES.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `Re-fetch prices from the gov API and patch ES.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `Re-fetch metadata from OSM and patch ES.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `Refresh a single station from its stale sources.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Entry point called after each search response.      Filters stations that need r`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `Return CORS origins as a list.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `Run a full ingestion at startup if the index is empty or missing.     Retries up`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppStateService` connect `Community 1` to `Community 10`, `Community 5`, `Community 14`, `Community 7`?**
  _High betweenness centrality (0.304) - this node is a cross-community bridge._
- **Why does `StationCardComponent` connect `Community 7` to `Community 8`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `search()` connect `Community 11` to `Community 0`, `Community 1`, `Community 4`?**
  _High betweenness centrality (0.130) - this node is a cross-community bridge._
- **Are the 22 inferred relationships involving `Vehicle` (e.g. with `GeoPointIn` and `VehicleIn`) actually correct?**
  _`Vehicle` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 22 inferred relationships involving `Preferences` (e.g. with `GeoPointIn` and `VehicleIn`) actually correct?**
  _`Preferences` has 22 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `PriceHistoryComponent` (e.g. with `get_price_history endpoint` and `StationCardComponent`) actually correct?**
  _`PriceHistoryComponent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 5 inferred relationships involving `AppStateService` (e.g. with `RoutePanelComponent` and `StationCardComponent`) actually correct?**
  _`AppStateService` has 5 INFERRED edges - model-reasoned connections that need verification._