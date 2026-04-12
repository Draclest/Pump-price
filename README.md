# ⛽ Prix à la Pompe

Application web **mobile-first** pour trouver la station-service la moins chère autour de vous, en temps réel.

![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-Angular%2017-DD0031?style=flat-square)
![Stack](https://img.shields.io/badge/Search-Elasticsearch%208-005571?style=flat-square)
![Stack](https://img.shields.io/badge/Map-Leaflet-199900?style=flat-square)
![Stack](https://img.shields.io/badge/Observability-OpenTelemetry-F5A623?style=flat-square)

---

## Fonctionnalités

- **Géolocalisation** : détecte automatiquement votre position
- **Carte interactive** : marqueurs avec le prix du carburant sélectionné
- **Filtres** : type de carburant (SP95, SP98, E10, E85, GPL, Diesel), rayon, prix maximum
- **Tri par distance** : les stations les plus proches en premier
- **Données fraîches** : ingestion automatique depuis [data.gouv.fr](https://www.data.gouv.fr) toutes les 6 heures
- **Historique des prix** : 30 jours de données conservées

---

## Architecture

```
prix-a-la-pompe/
├── backend/                  # API Python / FastAPI
│   ├── app/
│   │   ├── api/              # Endpoints REST
│   │   ├── models/           # Schémas Pydantic
│   │   ├── services/         # Logique métier + client Elasticsearch
│   │   ├── workers/          # Pipeline d'ingestion des données
│   │   └── observability/    # Configuration OpenTelemetry
│   ├── tests/                # Tests unitaires et API
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # SPA Angular 17 (standalone)
│   ├── src/app/
│   │   ├── components/map/          # Carte Leaflet
│   │   ├── components/filters/      # Panneau de filtres
│   │   ├── components/station-card/ # Carte d'une station
│   │   └── services/                # HTTP + Géolocalisation
│   ├── nginx/                # Config reverse proxy
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

### Stack technique

| Composant       | Technologie                  |
|-----------------|------------------------------|
| Backend         | Python 3.12, FastAPI         |
| Recherche       | Elasticsearch 8 (`geo_point`) |
| Frontend        | Angular 17, Leaflet          |
| Observabilité   | OpenTelemetry (traces, métriques, logs) |
| Infrastructure  | Docker, Docker Compose       |
| Données         | data.gouv.fr / data.economie.gouv.fr |

---

## Prérequis

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/) ≥ 2.x

---

## Démarrage rapide

### 1. Configuration

```bash
cp .env.example .env
# Modifiez .env si nécessaire (mot de passe Elasticsearch, etc.)
```

### 2. Lancer les services

```bash
docker compose up --build
```

Les services démarrent dans cet ordre :
1. **Elasticsearch** (port 9200) — attend le healthcheck
2. **Backend** (port 8000) — attend Elasticsearch
3. **Frontend** (port 4200) — nginx + proxy vers le backend

### 3. Charger les données

Au premier lancement, déclenchez manuellement l'ingestion :

```bash
curl -X POST http://localhost:8000/api/v1/ingestion/trigger/sync
```

L'ingestion récupère ~10 000 stations en France et les indexe dans Elasticsearch. Elle tourne ensuite automatiquement toutes les 6 heures.

### 4. Accéder à l'application

| URL | Description |
|-----|-------------|
| http://localhost:4200 | Application web |
| http://localhost:8000/docs | Documentation API (Swagger) |
| http://localhost:8000/health | Healthcheck backend |

---

## API

### Recherche de stations

```
GET /api/v1/stations/search
```

| Paramètre   | Type    | Requis | Défaut | Description                        |
|-------------|---------|--------|--------|------------------------------------|
| `lat`       | float   | ✅     | —      | Latitude                           |
| `lon`       | float   | ✅     | —      | Longitude                          |
| `radius_km` | float   | —      | 10     | Rayon de recherche (0.1–100 km)    |
| `fuel_type` | string  | —      | —      | SP95, SP98, E10, E85, GPLc, Gazole |
| `max_price` | float   | —      | —      | Prix maximum (€/L)                 |
| `limit`     | int     | —      | 20     | Nombre de résultats (1–100)        |

**Exemple :**
```bash
curl "http://localhost:8000/api/v1/stations/search?lat=48.8566&lon=2.3522&radius_km=5&fuel_type=SP95"
```

### Détail d'une station

```
GET /api/v1/stations/{id}
```

### Historique des prix

```
GET /api/v1/stations/{id}/history/{fuel_type}?days=30
```

### Ingestion manuelle

```
POST /api/v1/ingestion/trigger        # asynchrone (background)
POST /api/v1/ingestion/trigger/sync   # synchrone (attend la fin)
```

---

## Observabilité

### Configuration

Dans `.env`, choisissez l'exporteur OpenTelemetry :

```env
# Console (logs locaux)
OTEL_EXPORTER_TYPE=console

# OpenTelemetry Collector (Jaeger, Tempo, etc.)
OTEL_EXPORTER_TYPE=otlp
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Jaeger direct
OTEL_EXPORTER_TYPE=jaeger
OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:14268/api/traces
```

### Ce qui est instrumenté

- **Traces** : tous les endpoints FastAPI, requêtes Elasticsearch, appels HTTP externes
- **Métriques** : latence des requêtes, taux d'erreur, throughput, durée d'ingestion, nombre de stations indexées
- **Logs** : JSON structuré, corrélés avec les traces

---

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

---

## Variables d'environnement

| Variable                      | Défaut                        | Description                             |
|-------------------------------|-------------------------------|-----------------------------------------|
| `ELASTICSEARCH_URL`           | `http://elasticsearch:9200`   | URL Elasticsearch                       |
| `ELASTICSEARCH_USERNAME`      | `elastic`                     | Utilisateur Elasticsearch               |
| `ELASTICSEARCH_PASSWORD`      | `changeme`                    | Mot de passe Elasticsearch              |
| `BACKEND_PORT`                | `8000`                        | Port du backend                         |
| `LOG_LEVEL`                   | `INFO`                        | Niveau de logs                          |
| `OTEL_EXPORTER_TYPE`          | `console`                     | Exporteur OTel (`console`/`otlp`/`jaeger`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4317`  | Endpoint OTLP                           |
| `OTEL_SERVICE_NAME`           | `prix-pompe-api`              | Nom du service OTel                     |
| `INGESTION_SCHEDULE`          | `0 */6 * * *`                 | Cron d'ingestion (toutes les 6h)        |

---

## Données

Les données proviennent du jeu de données ouvert **Prix des carburants en France** publié par le Ministère de l'Économie sur [data.economie.gouv.fr](https://data.economie.gouv.fr).

- Mise à jour : toutes les 6 heures
- Rétention : 30 jours d'historique
- ~10 000 stations référencées

---

## Licence

Projet open source sous licence MIT.
