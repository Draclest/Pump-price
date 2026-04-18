# Prix à la Pompe

Application web de comparaison et de recommandation de stations-service en France.

**Stack** : FastAPI · Elasticsearch · Angular · Leaflet · Docker

---

## Lancement rapide (Docker)

### Prérequis

- Docker ≥ 24
- Docker Compose ≥ 2.20
- 2 Go de RAM libre (Elasticsearch)

### 1. Configurer l'environnement

```bash
cp .env.example .env
```

Éditer `.env` et remplir **obligatoirement** :

| Variable | Description |
|---|---|
| `ELASTICSEARCH_PASSWORD` | Mot de passe que **vous choisissez** pour Elasticsearch. Générez-en un avec `openssl rand -hex 24`. |
| `INGESTION_API_KEY` | Clé secrète que **vous créez vous-même** pour protéger le déclenchement manuel de l'ingestion. Générez-en une avec `openssl rand -hex 32`. Laissez vide pour désactiver les endpoints d'ingestion manuelle (l'ingestion automatique au démarrage fonctionne toujours). |
| `CORS_ALLOWED_ORIGINS` | Origines autorisées à appeler l'API (ex: `http://localhost:4200`). |

### 2. Démarrer

```bash
docker compose up --build
```

### 3. Accéder

| Service | URL |
|---|---|
| Frontend | http://localhost:4200 |
| API (docs) | http://localhost:8000/docs |
| Health check | http://localhost:8000/health |

La première ingestion (10 000+ stations) démarre automatiquement et prend 2–5 minutes. L'interface affiche une carte vide en attendant.

---

## Architecture

```
prix-a-la-pompe/
├── backend/              # Python / FastAPI
│   ├── app/
│   │   ├── main.py       # Entrée : CORS, rate limiting, middlewares sécurité
│   │   ├── config.py     # Paramètres (pydantic-settings, .env)
│   │   ├── api/
│   │   │   ├── stations.py    # Endpoints recherche / recommandation
│   │   │   └── ingestion.py   # Endpoints ingestion (protégés par API key)
│   │   ├── models/       # Modèles Pydantic
│   │   ├── services/     # Elasticsearch, scoring, routing, OSM
│   │   └── workers/      # Pipeline d'ingestion, refresh en arrière-plan
│   └── tests/
│       ├── test_api.py       # Tests HTTP (auth, validation, headers sécurité)
│       ├── test_scoring.py   # Tests unitaires moteur de scoring
│       └── test_config.py    # Tests validation configuration
│
├── frontend/             # Angular 17 + Leaflet
│   ├── src/app/
│   │   ├── components/   # map, station-card, filters, address-search…
│   │   └── services/     # state, station, géoloc, routing…
│   └── nginx/
│       └── default.conf.template  # Headers sécurité + proxy API
│
└── docker-compose.yml
```

### Flux de données

```
data.economie.gouv.fr ──┐
                         ├─→ Pipeline ingestion ──→ Elasticsearch
OpenStreetMap (Overpass)─┘                               ↓
                                              FastAPI (scoring 0-100)
                                                         ↓
                                           Angular + Leaflet (UI)
```

---

## Sécurité

### Correctifs appliqués

| # | Sévérité | Problème | Correction |
|---|---|---|---|
| 1 | **Critique** | `allow_origins=["*"]` | CORS restreint via `CORS_ALLOWED_ORIGINS` |
| 2 | **Critique** | Password `changeme` hardcodé | Variable requise, pas de valeur par défaut |
| 3 | **Critique** | Fallback `:-changeme` dans Docker | Supprimé — compose échoue sans variable |
| 4 | **Haute** | `verify_certs=False` en dur | Configurable via `ELASTICSEARCH_VERIFY_CERTS` |
| 5 | **Haute** | Endpoints ingestion sans auth | API key requis (`X-API-Key` header, `secrets.compare_digest`) |
| 6 | **Haute** | Aucun header sécurité Nginx | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| 7 | **Haute** | Container backend en root | Utilisateur non-root (uid 1001) |
| 8 | **Moyenne** | Aucun rate limiting | SlowAPI, 60 req/min par IP (configurable) |
| 9 | **Moyenne** | Port Elasticsearch exposé | Port non-exposé par défaut dans docker-compose |
| 10 | **Moyenne** | Image avec CVEs connues | `python:3.13-slim` + `apt-get upgrade` au build |

### Recommandations production

- Activer HTTPS et décommenter HSTS dans `nginx/default.conf.template`
- Mettre `ELASTICSEARCH_VERIFY_CERTS=true` avec des certificats valides
- Restreindre `CORS_ALLOWED_ORIGINS` à votre domaine uniquement
- Utiliser un reverse proxy (Nginx/Traefik) devant Docker pour TLS termination
- Ne jamais exposer le port Elasticsearch (9200) publiquement

---

## API

### Endpoints publics

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/stations/search` | Recherche géographique |
| `GET` | `/api/v1/stations/recommend` | Recommandation scorée |
| `POST` | `/api/v1/stations/route-recommend` | Stations sur un itinéraire |
| `GET` | `/api/v1/stations/{id}` | Détail d'une station |
| `GET` | `/api/v1/stations/{id}/history/{fuel}` | Historique des prix |
| `GET` | `/health` | Health check |

### Endpoints protégés (`X-API-Key` requis)

| Méthode | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ingestion/trigger` | Lancer l'ingestion (background) |
| `POST` | `/api/v1/ingestion/trigger/sync` | Lancer l'ingestion (synchrone) |
| `GET` | `/api/v1/ingestion/debug/index` | Stats de l'index Elasticsearch |

```bash
curl -X POST http://localhost:8000/api/v1/ingestion/trigger \
  -H "X-API-Key: votre-clé-ici"
```

---

## Développement local (sans Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Elasticsearch minimal (dev uniquement)
docker run -d -e discovery.type=single-node \
  -e ELASTIC_PASSWORD=dev-password \
  -e xpack.security.enabled=true \
  -p 9200:9200 \
  docker.elastic.co/elasticsearch/elasticsearch:8.13.0

export ELASTICSEARCH_PASSWORD=dev-password
export CORS_ALLOWED_ORIGINS=http://localhost:4200

uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start   # proxy configuré vers http://localhost:8000
```

### Tests

```bash
cd backend
ELASTICSEARCH_PASSWORD=test pytest tests/ -v
```

---

## Variables d'environnement

Voir [.env.example](.env.example) pour la liste complète avec descriptions.

| Variable | Requis | Défaut | Description |
|---|---|---|---|
| `ELASTICSEARCH_PASSWORD` | **Oui** | — | Mot de passe Elasticsearch |
| `BACKEND_URL` | **Oui** | — | URL interne backend (Docker: `http://backend:8000`) |
| `CORS_ALLOWED_ORIGINS` | Non | `http://localhost:4200` | Origines CORS autorisées |
| `INGESTION_API_KEY` | Non | _(vide)_ | Vide = endpoints désactivés |
| `RATE_LIMIT_PER_MINUTE` | Non | `60` | Requêtes max/min par IP |
| `ELASTICSEARCH_VERIFY_CERTS` | Non | `false` | Vérification TLS |
| `LOG_LEVEL` | Non | `INFO` | `DEBUG\|INFO\|WARNING\|ERROR` |

---

## Moteur de scoring (0–100)

| Critère | Poids | Logique |
|---|---|---|
| Prix | **60%** | Moins cher = 100, écart ≥ 1€/L = 0 (linéaire) |
| Distance | **35%** | 0 km = 100, rayon max = 0 (linéaire) |
| Fraîcheur | **4%** | < 2h = 100, ≥ 48h = 0 (linéaire) |
| Services | **1%** | Ouvert (0.35) + CB auto (0.30) + boutique (0.20) + lavage (0.10) + WC (0.05) |

En mode itinéraire, "distance" est remplacée par "détour" (zone franche ≤ 3% du trajet).
