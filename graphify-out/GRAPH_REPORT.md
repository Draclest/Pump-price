# Graph Report - /home/draclest/Documents/Claude_project/prix à la pompe  (2026-04-19)

## Corpus Check
- 51 files · ~76,759 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 387 nodes · 546 edges · 32 communities detected
- Extraction: 81% EXTRACTED · 19% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.77)
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
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]

## God Nodes (most connected - your core abstractions)
1. `MapComponent` - 19 edges
2. `Settings` - 15 edges
3. `score_stations()` - 14 edges
4. `StationCardComponent` - 12 edges
5. `AppStateService` - 12 edges
6. `_run_ingestion_inner()` - 11 edges
7. `_base_env()` - 11 edges
8. `AppComponent` - 10 edges
9. `RoutePanelComponent` - 10 edges
10. `_refresh_osm()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Open Project - Pump Price` --conceptually_related_to--> `Prix a la Pompe (README)`  [INFERRED]
  CLAUDE.md → README.md
- `Station Scoring System (0-100)` --implements--> `Scoring Weights price 60pct dist 35pct freshness 4pct services 1pct`  [INFERRED]
  CLAUDE.md → README.md
- `Settings` --uses--> `Tests for configuration validation.  Verifies that the application fails fast wi`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/app/config.py → /home/draclest/Documents/Claude_project/prix à la pompe/backend/tests/test_config.py
- `Settings` --uses--> `Return a minimal valid env dict.`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/app/config.py → /home/draclest/Documents/Claude_project/prix à la pompe/backend/tests/test_config.py
- `Settings` --calls--> `test_settings_missing_password_raises()`  [INFERRED]
  /home/draclest/Documents/Claude_project/prix à la pompe/backend/app/config.py → /home/draclest/Documents/Claude_project/prix à la pompe/backend/tests/test_config.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (27): close_es(), get_es(), ensure_history_index(), ensure_index(), get_es_client(), _cleanup_old_history(), debug_index(), get_ingestion_status() (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (5): AddressSearchComponent, AppComponent, AppStateService, GeolocationService, RoutingService

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (37): _best_fuel(), _fraicheur_score(), haversine_km(), Scoring and recommendation service for fuel stations. Rates stations 0-100 combi, Return the great-circle distance in km between two points., Scoring rules for route mode:       price   60% — cheapest = 100, gap ≥ 1.00 €/L, Return 0.0-1.0 fraîcheur: 1.0 si < 1h, décroit linéairement jusqu'à 0 à 168h (7, Return 0.0-1.0 score based on available services. (+29 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (29): get_brand_color(), get_logo_url(), Brand Logos =========== Maps normalized brand keys (from osm_enrichment._normali, _finalise(), Compute derived display fields after cross-reference., _expand_days(), format_opening_hours(), is_open_now() (+21 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (19): BaseModel, GeocodingService, FuelPrice, GeoPoint, SearchParams, get_price_history(), get_station_by_id(), Map an ES _source dict to StationSearchResult, recomputing is_open live. (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (26): Backend (Python/FastAPI), data_confidence_score, data.gouv.fr fuel price dataset, Decision Engine, Docker / docker-compose, Elasticsearch, .env configuration, Frontend (Angular/Leaflet) (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (3): MapComponent, openRoute(), routeUrl()

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (2): FiltersComponent, RoutePanelComponent

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (17): BaseSettings, Application settings — all values come from environment variables or .env file., Return CORS origins as a list., Settings, _base_env(), Tests for configuration validation.  Verifies that the application fails fast wi, Return a minimal valid env dict., test_cors_origins_empty_raises() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (18): build_spatial_index(), _cell(), cross_reference(), extract_osm_fields(), fetch_all_france(), fetch_by_osm_id(), _haversine_m(), nearest_osm() (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (6): _make_station(), API endpoint tests.  These tests use ASGI transport (no real server) and mock El, Correct API key → ingestion is accepted (background task, status 200)., Return a minimal valid station dict., test_ingestion_trigger_correct_key_accepted(), test_search_returns_results()

### Community 11 - "Community 11"
Cohesion: 0.15
Nodes (2): PriceHistoryComponent, PriceHistoryService

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (1): StationCardComponent

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (11): fetch_all(), fetch_by_ids(), _fmt_time(), _parse_horaires(), parse_records_to_stations(), Government Data Client (data.economie.gouv.fr) =================================, Group raw records (one per station × fuel_type) into station dicts.      Each re, Fetch the full gov dataset (export endpoint, returns a flat JSON list of ~74k re (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.24
Nodes (10): filter_stations_near_route(), get_route(), _haversine_km(), _project_point_to_segment(), Routing service: fetches route geometry from OSRM and provides helpers to filter, Returns stations whose detour_km <= max_detour_km,     each enriched with _route, Returns:     {         "coordinates": [[lon, lat], ...],  # GeoJSON order, Projects point (px,py) onto segment (ax,ay)-(bx,by).     Returns (closest_x, clo (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (3): haversineKm(), StationCacheService, StationService

### Community 16 - "Community 16"
Cohesion: 0.47
Nodes (1): IngestionStatusService

### Community 17 - "Community 17"
Cohesion: 0.6
Nodes (3): make_raw_station(), test_parse_station_basic(), test_parse_station_missing_coordinates()

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **68 isolated node(s):** `Application settings — all values come from environment variables or .env file.`, `Return CORS origins as a list.`, `Application entry point.  Security measures implemented here: - CORS: restricted`, `Run a full ingestion at startup if the index is empty or missing.     Retries up`, `Dependency that validates the X-API-Key header.     - If INGESTION_API_KEY is no` (+63 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 18`** (1 nodes): `proxy.conf.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `main.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `environment.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `environment.prod.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `app.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `station.model.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `telemetry.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `__init__.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `_to_result()` connect `Community 4` to `Community 3`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `is_open_now()` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Why does `_finalise()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `Settings` (e.g. with `Tests for configuration validation.  Verifies that the application fails fast wi` and `Return a minimal valid env dict.`) actually correct?**
  _`Settings` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `score_stations()` (e.g. with `recommend_stations()` and `test_score_stations_empty_returns_empty()`) actually correct?**
  _`score_stations()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Application settings — all values come from environment variables or .env file.`, `Return CORS origins as a list.`, `Application entry point.  Security measures implemented here: - CORS: restricted` to the rest of the system?**
  _68 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._