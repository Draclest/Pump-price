# Graph Report - prix à la pompe  (2026-06-26)

## Corpus Check
- 63 files · ~35,353 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 498 nodes · 743 edges · 51 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 199 edges (avg confidence: 0.72)
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
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
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

## God Nodes (most connected - your core abstractions)
1. `PriceHistoryComponent` - 22 edges
2. `MapComponent` - 21 edges
3. `Vehicle` - 20 edges
4. `Preferences` - 20 edges
5. `Settings` - 19 edges
6. `AppStateService` - 18 edges
7. `StationCardComponent` - 15 edges
8. `AppComponent` - 14 edges
9. `score_stations()` - 14 edges
10. `search_net_gain()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `get_price_history endpoint` --calls--> `PriceHistoryComponent`  [INFERRED]
  backend/app/api/stations.py → frontend/src/app/components/price-history/price-history.component.ts
- `search_stations endpoint` --shares_data_with--> `MapComponent`  [INFERRED]
  backend/app/api/stations.py → frontend/src/app/components/map/map.component.ts
- `Settings` --conceptually_related_to--> `AppStateService`  [INFERRED]
  backend/app/config.py → frontend/src/app/services/app-state.service.ts
- `recommend_stations endpoint` --calls--> `AppStateService`  [INFERRED]
  backend/app/api/stations.py → frontend/src/app/services/app-state.service.ts
- `route_recommend endpoint` --calls--> `AppStateService`  [INFERRED]
  backend/app/api/stations.py → frontend/src/app/services/app-state.service.ts

## Hyperedges (group relationships)
- **Frontend Station Display Pipeline** — app_state_service_appstateservice, map_component_mapcomponent, station_card_component_stationcardcomponent, price_history_component_pricehistorycomponent [INFERRED 0.85]
- **Backend Price Refresh Pipeline** — refresh_schedule_refresh, refresh_refresh_station, refresh_refresh_gov, gov_client_fetch_by_ids, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Live Feed Update Pipeline** — live_feed_run_live_feed, gov_client_fetch_live, gov_client_parse_live_records, ingestion_state_live_feed_state, elasticsearch_client_index_name [EXTRACTED 0.95]
- **Station Recommendation & Scoring Flow** — stations_recommend_stations, stations_route_recommend, stations_search_stations, refresh_schedule_refresh [EXTRACTED 0.90]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (46): compute_net_gain(), confidence_from_age(), GeoPointIn, NetGainBreakdown, NetGainInput, NetGainRequest, NetGainResult, Preferences (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (5): AppComponent, AppStateService, GeolocationService, IngestionStatusService, RoutingService

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (36): _age_minutes(), es_types_for(), _nested_fuel_query(), prefilter_bbox(), prefilter_radius(), Repository ES du moteur de gain net — étage 1 (préfiltre).  Réutilise l'index ex, Préfiltre géo (rayon) — modes nearby / habitual., Préfiltre par bounding box (corridor d'itinéraire) — mode route.      top_left = (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (37): _best_fuel(), _fraicheur_score(), haversine_km(), Scoring and recommendation service for fuel stations. Rates stations 0-100 combi, Return the great-circle distance in km between two points., Scoring rules for route mode:       price   60% — cheapest = 100, gap ≥ 1.00 €/L, Return 0.0-1.0 fraîcheur: 1.0 si < 1h, décroit linéairement jusqu'à 0 à 168h (7, Return 0.0-1.0 score based on available services. (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (31): get_brand_color(), get_logo_url(), Brand Logos =========== Maps normalized brand keys (from osm_enrichment._normali, ensure_index, STATION_MAPPING, fetch_all, fetch_by_ids, parse_records_to_stations (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (26): Backend (Python/FastAPI), data_confidence_score, data.gouv.fr fuel price dataset, Decision Engine, Docker / docker-compose, Elasticsearch, .env configuration, Frontend (Angular/Leaflet) (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (18): BaseModel, GeocodingService, schedule_refresh, FuelPrice, GeoPoint, SearchParams, get_price_history(), get_station_by_id() (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (3): HISTORY_INDEX fuel-price-history, PriceHistoryComponent, get_price_history endpoint

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (2): FiltersComponent, RoutePanelComponent

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (15): close_es(), get_es(), get_es_client, INDEX_NAME fuel-stations, fetch_live, _parse_live_records, get_ingestion_status endpoint, ingestion_state singleton (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (17): BaseSettings, Application settings — all values come from environment variables or .env file., Return CORS origins as a list., Settings, _base_env(), Tests for configuration validation.  Verifies that the application fails fast wi, Return a minimal valid env dict., test_cors_origins_empty_raises() (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (4): safeBrandColor, openRoute(), routeUrl(), StationCardComponent

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (1): MapComponent

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (18): build_spatial_index(), _cell(), cross_reference(), extract_osm_fields(), fetch_all_france(), fetch_by_osm_id(), _haversine_m(), nearest_osm() (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (4): PriceHistoryService, haversineKm(), StationCacheService, StationService

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (6): _make_station(), API endpoint tests.  These tests use ASGI transport (no real server) and mock El, Correct API key → ingestion is accepted (background task, status 200)., Return a minimal valid station dict., test_ingestion_trigger_correct_key_accepted(), test_search_returns_results()

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (7): instrument_fastapi(), _parse_headers(), OpenTelemetry setup — traces, metrics, logs via OTLP HTTP.  Activated only whe, Attach FastAPI auto-instrumentation (traces on every route)., Parse 'Key=Value,Key2=Value2' into a dict., Configure OTel SDK.  Returns a LoggingHandler to attach to the root logger,, setup_telemetry()

### Community 17 - "Community 17"
Cohesion: 0.43
Nodes (1): IconComponent

### Community 18 - "Community 18"
Cohesion: 0.6
Nodes (3): make_raw_station(), test_parse_station_basic(), test_parse_station_missing_coordinates()

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (1): SortBarComponent

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): StationListComponent

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (1): AddressSearchComponent

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (1): brandInitial

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): stations router

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): ingestion router

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): trigger_ingestion endpoint

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): HISTORY_MAPPING

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Dependency that validates the X-API-Key header.     - If INGESTION_API_KEY is no

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): Public endpoint — no authentication required.     Returns the current ingestion

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Trigger a full data ingestion in the background (non-blocking).

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Trigger a full data ingestion and wait for completion (blocking).

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Return index stats and a sample document to verify ingestion.

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Government Data Client (data.economie.gouv.fr) =================================

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Convert '07.40' or '07:40' to '07:40'.

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (1): Convert the gov 'horaires' JSON field to an OSM-format opening_hours string.

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (1): Group raw records (one per station × fuel_type) into station dicts.      Each re

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (1): Parse the live feed format (one record per station, prices as columns).     Fiel

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (1): Fetch the live feed (prix-des-carburants-en-france-flux-instantane-v2).     Upda

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (1): Fetch the full gov dataset (export endpoint, returns a flat JSON list of ~74k re

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (1): Fetch a subset of stations by their gov IDs.     Used for targeted price refresh

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (1): In-memory ingestion state tracker.  Provides a single source of truth for the cu

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (1): Live Feed Worker ================ Polls the prix-carburants-flux-instantane-v2 d

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (1): Fetch the live price feed and patch Elasticsearch with updated fuel prices.

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (1): Background Station Refresh =========================== Triggered after each sear

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (1): Partial update of a station document in ES.

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (1): Re-fetch prices from the gov API and patch ES.

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (1): Re-fetch metadata from OSM and patch ES.

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (1): Refresh a single station from its stale sources.

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (1): Entry point called after each search response.      Filters stations that need r

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): Return CORS origins as a list.

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): Run a full ingestion at startup if the index is empty or missing.     Retries up

## Knowledge Gaps
- **100 isolated node(s):** `SortBarComponent`, `AddressSearchComponent`, `StationListComponent`, `brandInitial`, `Application settings — all values come from environment variables or .env file.` (+95 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (22 nodes): `FiltersComponent`, `.clearPrice()`, `.currentFuelNote()`, `.emit()`, `.emitRadiusDebounced()`, `.isServiceSelected()`, `.onMaxPriceChange()`, `.selectFuel()`, `.toggleService()`, `filters.component.ts`, `route-panel.component.ts`, `RoutePanelComponent`, `.canSubmit()`, `.clear()`, `.constructor()`, `.ngOnChanges()`, `.onDestChange()`, `.onOriginChange()`, `.submit()`, `.swapFields()`, `._watchField()`, `.onCardClick()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (19 nodes): `map.component.ts`, `MapComponent`, `._applyHover()`, `._buildIcon()`, `._centerOnUser()`, `._createMarker()`, `._diffMarkers()`, `.formatDistance()`, `.formatFuelDate()`, `.hoveredStationId()`, `._initMap()`, `.isFuelHighlighted()`, `.ngAfterViewInit()`, `.ngOnChanges()`, `.ngOnDestroy()`, `.onPanelLogoError()`, `._refreshAllIcons()`, `._updateRoutePolyline()`, `._updateSelectionMarkers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (7 nodes): `icon.component.ts`, `IconComponent`, `._build()`, `.constructor()`, `.name()`, `.size()`, `.strokeWidth()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `sort-bar.component.ts`, `SortBarComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `station-list.component.ts`, `StationListComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `AddressSearchComponent`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `brandInitial`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `stations router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `ingestion router`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `trigger_ingestion endpoint`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `HISTORY_MAPPING`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `Dependency that validates the X-API-Key header.     - If INGESTION_API_KEY is no`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `Public endpoint — no authentication required.     Returns the current ingestion`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Trigger a full data ingestion in the background (non-blocking).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Trigger a full data ingestion and wait for completion (blocking).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Return index stats and a sample document to verify ingestion.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Government Data Client (data.economie.gouv.fr) =================================`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Convert '07.40' or '07:40' to '07:40'.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Convert the gov 'horaires' JSON field to an OSM-format opening_hours string.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `Group raw records (one per station × fuel_type) into station dicts.      Each re`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `Parse the live feed format (one record per station, prices as columns).     Fiel`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `Fetch the live feed (prix-des-carburants-en-france-flux-instantane-v2).     Upda`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `Fetch the full gov dataset (export endpoint, returns a flat JSON list of ~74k re`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `Fetch a subset of stations by their gov IDs.     Used for targeted price refresh`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `In-memory ingestion state tracker.  Provides a single source of truth for the cu`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `Live Feed Worker ================ Polls the prix-carburants-flux-instantane-v2 d`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `Fetch the live price feed and patch Elasticsearch with updated fuel prices.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `Background Station Refresh =========================== Triggered after each sear`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `Partial update of a station document in ES.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `Re-fetch prices from the gov API and patch ES.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `Re-fetch metadata from OSM and patch ES.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `Refresh a single station from its stale sources.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `Entry point called after each search response.      Filters stations that need r`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `Return CORS origins as a list.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `Run a full ingestion at startup if the index is empty or missing.     Retries up`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppStateService` connect `Community 1` to `Community 2`, `Community 6`, `Community 8`, `Community 10`, `Community 11`?**
  _High betweenness centrality (0.324) - this node is a cross-community bridge._
- **Why does `route_recommend endpoint` connect `Community 2` to `Community 9`, `Community 3`, `Community 6`, `Community 1`?**
  _High betweenness centrality (0.220) - this node is a cross-community bridge._
- **Why does `StationCardComponent` connect `Community 11` to `Community 8`, `Community 1`, `Community 7`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `PriceHistoryComponent` (e.g. with `get_price_history endpoint` and `StationCardComponent`) actually correct?**
  _`PriceHistoryComponent` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Vehicle` (e.g. with `GeoPointIn` and `VehicleIn`) actually correct?**
  _`Vehicle` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Preferences` (e.g. with `GeoPointIn` and `VehicleIn`) actually correct?**
  _`Preferences` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 13 inferred relationships involving `Settings` (e.g. with `Tests for configuration validation.  Verifies that the application fails fast wi` and `Return a minimal valid env dict.`) actually correct?**
  _`Settings` has 13 INFERRED edges - model-reasoned connections that need verification._