# Prix à la Pompe

Application web **mobile-first** pour trouver la station-service optimale autour de vous, en temps réel. Scoring intelligent basé sur le prix, la distance et la fraîcheur des données.

![Stack](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square)
![Stack](https://img.shields.io/badge/Frontend-Angular%2017-DD0031?style=flat-square)
![Stack](https://img.shields.io/badge/Search-Elasticsearch%208-005571?style=flat-square)
![Stack](https://img.shields.io/badge/Map-Leaflet-199900?style=flat-square)
![Stack](https://img.shields.io/badge/Infra-Docker%20Compose-2496ED?style=flat-square)

---

## Fonctionnalités

- **Géolocalisation** : détecte automatiquement votre position ou accepte une adresse
- **Carte interactive** : marqueurs avec le prix du carburant sélectionné
- **Scoring intelligent** : classement par prix (60%), distance (35%), fraîcheur (4%), services (1%)
- **Mode itinéraire** : trouve les stations sur votre trajet avec un détour minimal
- **Filtres** : type de carburant (SP95, SP98, E10, E85, GPL, Diesel), rayon, prix maximum, services
- **Historique des prix** : 30 jours de données conservées avec courbe de tendance
- **Données fraîches** : ingestion automatique depuis data.economie.gouv.fr toutes les 6 heures

---

## Architecture

```
prix-a-la-pompe/
├── backend/                  # API Python / FastAPI
│   ├── app/
│   │   ├── api/              # Endpoints REST
│   │   ├── models/           # Schémas Pydantic
│   │   ├── services/         # Scoring + client Elasticsearch
│   │   ├── workers/          # Pipeline d'ingestion des données
│   │   └── observability/    # Configuration OpenTelemetry
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # SPA Angular 17 (standalone components)
│   ├── src/app/
│   ├── nginx/                # Config Nginx (reverse proxy vers /api/)
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

| Composant     | Technologie                             |
|---------------|-----------------------------------------|
| Backend       | Python 3.12, FastAPI, Uvicorn           |
| Recherche     | Elasticsearch 8.13 (`geo_point`)        |
| Frontend      | Angular 17, Leaflet, Nginx              |
| Observabilité | OpenTelemetry (traces, métriques, logs) |
| Données       | data.economie.gouv.fr                   |

---

## Déploiement sur un serveur

### Prérequis

- Docker ≥ 24 — [installer Docker](https://docs.docker.com/engine/install/)
- Docker Compose v2 (commande `docker compose`, sans tiret)
- **2 Go de RAM minimum** (Elasticsearch en consomme 512 Mo par défaut)
- Ports `8000` et `4200` disponibles par défaut (modifiables dans `.env`)

```bash
# Vérifier les versions installées
docker --version
docker compose version
```

---

### Étape 1 — Récupérer le projet

```bash
git clone <url-du-repo> prix-a-la-pompe
cd prix-a-la-pompe
```

---

### Étape 2 — Configurer l'environnement

```bash
cp .env.example .env
nano .env   # ou vim, ou tout autre éditeur
```

**Paramètre obligatoire à modifier :**

```dotenv
# ⚠️  Changer ce mot de passe avant tout déploiement
ELASTICSEARCH_PASSWORD=MOT_DE_PASSE_FORT_ICI
```

**Ports (optionnel — défauts utilisés si non renseignés) :**

```dotenv
FRONTEND_PORT=4200      # interface web
BACKEND_PORT=8000       # API REST
ELASTICSEARCH_PORT=9200 # Elasticsearch (supprimer la ligne pour ne pas l'exposer)
```

**Autres paramètres optionnels :**

```dotenv
LOG_LEVEL=INFO                    # DEBUG pour plus de détails
INGESTION_SCHEDULE=0 */6 * * *    # fréquence d'ingestion (cron)

# OpenTelemetry — laisser "console" pour logger localement, sans export externe
OTEL_EXPORTER_TYPE=console
OTEL_SERVICE_NAME=prix-pompe-api
```

---

### Étape 3 — Construire et démarrer

```bash
docker compose up -d --build
```

L'option `-d` lance les conteneurs en arrière-plan.

**Ordre de démarrage automatique :**

1. **Elasticsearch** démarre et attend son healthcheck (~60 s)
2. **Backend** démarre une fois Elasticsearch prêt, puis lance l'ingestion initiale (~1–3 min)
3. **Frontend** (Nginx) devient disponible immédiatement après le build

```bash
# Suivre la progression en temps réel
docker compose logs -f
```

L'ingestion initiale est terminée quand vous voyez dans les logs :

```
backend  | "message": "Ingestion complete"
```

---

### Étape 4 — Vérifier le déploiement

```bash
# État des conteneurs (tous doivent être "Up")
docker compose ps

# Santé du backend
curl http://localhost:8000/health
# → {"status":"ok"}

# Compter les stations indexées
curl -u elastic:VOTRE_MOT_DE_PASSE \
  "http://localhost:9200/fuel-stations/_count"
```

L'interface est accessible sur **`http://<IP-DU-SERVEUR>:4200`**
La documentation API Swagger est sur **`http://<IP-DU-SERVEUR>:8000/docs`**

---

## Mise à jour

```bash
git pull
docker compose up -d --build
```

> Les données Elasticsearch sont conservées dans le volume Docker `es-data` — elles ne sont **pas perdues** lors d'une mise à jour.

---

## Laisser le projet tourner

Les conteneurs `backend` et `frontend` ont `restart: unless-stopped` dans `docker-compose.yml`. Ils redémarrent automatiquement après un reboot du serveur ou un crash.

```bash
# Vérifier que les conteneurs redémarrent bien après un reboot
docker compose ps
# STATUS doit indiquer "Up X hours"
```

Pour activer le démarrage automatique de Docker au boot du serveur :

```bash
sudo systemctl enable docker
```

---

## Commandes utiles

```bash
# Voir les logs en temps réel (Ctrl+C pour quitter)
docker compose logs -f
docker compose logs -f backend
docker compose logs -f elasticsearch

# Forcer une ingestion immédiate (sans attendre le cron)
curl -X POST http://localhost:8000/api/v1/ingestion/trigger/sync

# Redémarrer uniquement le backend
docker compose restart backend

# Reconstruire et redémarrer un service après modification de code
docker compose up -d --build backend
docker compose up -d --build frontend

# Ouvrir un shell dans le conteneur backend
docker compose exec backend bash

# Arrêter tous les services (sans perdre les données)
docker compose down

# Arrêter et SUPPRIMER toutes les données (reset complet)
docker compose down -v
```

---

## Déploiement derrière un reverse proxy (HTTPS)

Pour exposer l'application sur un domaine avec HTTPS, placer un reverse proxy devant le port `4200`.

### Caddy (recommandé — certificat SSL automatique)

```
# /etc/caddy/Caddyfile
prix.mondomaine.fr {
    reverse_proxy localhost:4200
}
```

```bash
sudo systemctl reload caddy
```

### Nginx + Certbot

```nginx
# /etc/nginx/sites-available/prix-pompe
server {
    listen 80;
    server_name prix.mondomaine.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name prix.mondomaine.fr;

    ssl_certificate     /etc/letsencrypt/live/prix.mondomaine.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/prix.mondomaine.fr/privkey.pem;

    location / {
        proxy_pass          http://127.0.0.1:4200;
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header    X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/prix-pompe /etc/nginx/sites-enabled/
sudo certbot --nginx -d prix.mondomaine.fr
sudo systemctl reload nginx
```

> **Note** : une fois derrière HTTPS, la géolocalisation du navigateur (`navigator.geolocation`) fonctionne sans restriction de sécurité.

---

## Sécuriser Elasticsearch

En production, **ne pas exposer le port 9200** au-delà du réseau Docker. Dans `.env`, supprimer ou commenter la ligne :

```dotenv
# ELASTICSEARCH_PORT=9200   ← commenter ou supprimer
```

Seul le backend (dans le même réseau Docker) a besoin d'accéder à Elasticsearch.

---

## Variables d'environnement

**Ports — seul `.env` à modifier, jamais `docker-compose.yml` :**

| Variable             | Défaut | Description                              |
|----------------------|--------|------------------------------------------|
| `FRONTEND_PORT`      | `4200` | Port hôte → interface web               |
| `BACKEND_PORT`       | `8000` | Port hôte → API REST                    |
| `ELASTICSEARCH_PORT` | `9200` | Port hôte → Elasticsearch               |

**Connexions inter-services :**

| Variable                      | Défaut                        | Description                                  |
|-------------------------------|-------------------------------|----------------------------------------------|
| `BACKEND_URL`                 | `http://backend:8000`         | URL du backend vue par Nginx (proxy `/api/`) |
| `ELASTICSEARCH_URL`           | `http://elasticsearch:9200`   | URL Elasticsearch (ne pas changer en Docker) |
| `ELASTICSEARCH_USERNAME`      | `elastic`                     | Utilisateur Elasticsearch                    |
| `ELASTICSEARCH_PASSWORD`      | `changeme`                    | **À changer obligatoirement**                |

**Application :**

| Variable                      | Défaut                        | Description                                  |
|-------------------------------|-------------------------------|----------------------------------------------|
| `LOG_LEVEL`                   | `INFO`                        | Niveau de logs (`DEBUG`, `INFO`, `WARNING`)  |
| `OTEL_EXPORTER_TYPE`          | `console`                     | Export OTel : `console` / `otlp` / `jaeger`  |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4317`  | Endpoint OTLP (si `otlp`)                    |
| `OTEL_SERVICE_NAME`           | `prix-pompe-api`              | Nom du service dans les traces               |
| `INGESTION_SCHEDULE`          | `0 */6 * * *`                 | Cron d'ingestion (toutes les 6 h)            |

---

## API

### Recherche de stations

```
GET /api/v1/stations/search
```

| Paramètre   | Type   | Requis | Défaut | Description                        |
|-------------|--------|--------|--------|------------------------------------|
| `lat`       | float  | ✅     | —      | Latitude                           |
| `lon`       | float  | ✅     | —      | Longitude                          |
| `radius_km` | float  | —      | 10     | Rayon de recherche (0.1–100 km)    |
| `fuel_type` | string | —      | —      | SP95, SP98, E10, E85, GPLc, Gazole |
| `max_price` | float  | —      | —      | Prix maximum (€/L)                 |
| `limit`     | int    | —      | 20     | Nombre de résultats (1–100)        |

```bash
curl "http://localhost:8000/api/v1/stations/search?lat=48.8566&lon=2.3522&radius_km=5&fuel_type=SP95"
```

### Itinéraire

```
GET /api/v1/stations/route
```

| Paramètre      | Type   | Requis | Description                 |
|----------------|--------|--------|-----------------------------|
| `origin_lat`   | float  | ✅     | Latitude départ             |
| `origin_lon`   | float  | ✅     | Longitude départ            |
| `dest_lat`     | float  | ✅     | Latitude destination        |
| `dest_lon`     | float  | ✅     | Longitude destination       |
| `fuel_type`    | string | —      | Type de carburant           |
| `max_detour_km`| float  | —      | Détour max accepté (km)     |

### Historique des prix

```
GET /api/v1/stations/{id}/history/{fuel_type}?days=30
```

### Ingestion manuelle

```
POST /api/v1/ingestion/trigger        # asynchrone
POST /api/v1/ingestion/trigger/sync   # synchrone (attend la fin)
```

---

## Dépannage

### Le backend ne démarre pas

```bash
docker compose logs backend
```

Cause fréquente : Elasticsearch n'est pas encore `healthy`. Attendre 60–90 s, puis :

```bash
docker compose restart backend
```

### Elasticsearch manque de mémoire (OOM)

Augmenter le heap JVM dans `docker-compose.yml` :

```yaml
environment:
  - ES_JAVA_OPTS=-Xms1g -Xmx1g
```

Puis `docker compose up -d elasticsearch`.

### Les prix ne s'affichent pas

L'ingestion initiale est peut-être encore en cours :

```bash
docker compose logs -f backend | grep -i ingestion
```

Ou forcer manuellement :

```bash
curl -X POST http://localhost:8000/api/v1/ingestion/trigger/sync
```

### Réinitialisation complète

```bash
docker compose down -v        # supprime volumes + données ES
docker compose up -d --build  # repart de zéro
```

---

## Développement local

Le frontend utilise des URLs relatives (`/api/v1`). En développement, `ng serve` proxifie automatiquement ces requêtes vers le backend via `proxy.conf.js`, qui lit `BACKEND_PORT` depuis l'environnement — aucun port en dur.

```bash
# Démarrer uniquement Elasticsearch + backend
docker compose up -d elasticsearch backend

# Lancer le dev server Angular (lit BACKEND_PORT depuis .env ou le shell)
cd frontend
export $(grep -v '^#' ../.env | xargs) && npm start

# Ou passer le port directement
BACKEND_PORT=9090 npm start
```

L'application est accessible sur `http://localhost:4200` (ou via l'IP de la machine, CORS inclus).

---

## Tests

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
```

---

## Données

Source : **Prix des carburants en France** — Ministère de l'Économie ([data.economie.gouv.fr](https://data.economie.gouv.fr))

- ~10 000 stations référencées
- Mise à jour toutes les 6 heures (configurable)
- Rétention : 30 jours d'historique

---

## Licence

Projet open source sous licence MIT.
