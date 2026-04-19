# Claude.md — Open Project Pump Price

## 🧭 Project Overview

**Name:** Open Project - Pump Price
**Goal:** Evolve from a simple price comparison tool into a **fuel decision assistant** that recommends the best station based on total cost, context, and data reliability.
**Audience:** General public
**Problem Solved:** Help users make the **optimal fueling decision**, not just find the lowest price.

---

## 🏗️ Technical Stack

### Backend

* Language: Python
* Framework: FastAPI
* Search Engine / Storage: Elasticsearch
* Client: Official Elasticsearch Python client

### Frontend

* Framework: Angular
* Map: Leaflet (open-source)

### Observability

* Standard: OpenTelemetry
* Signals:

  * Traces (mandatory)
  * Metrics (mandatory)
  * Logs (mandatory)
* Export: Must be configurable (Elastic, Jaeger, Prometheus, etc.)

### Infrastructure

* Local-first development
* Dockerized (mandatory)
* Monorepo structure

---

## 🤖 Claude Role (Agent Mode)

Claude acts as a **fully autonomous software engineer**.

### Responsibilities

* Design the full architecture
* Create the project structure
* Write production-ready code
* Implement API endpoints
* Implement frontend UI
* Configure observability (OpenTelemetry)
* Setup Docker environment
* Generate tests
* Propose improvements proactively
* Maintain and update this file (`claude.md`) as the architecture evolves

### Behavior

* Always act, do not wait for instructions unless ambiguity blocks progress
* Ask clarifying questions when needed
* Propose multiple technical options when relevant
* Justify technical decisions

---

## 📦 Data Management

### Sources

* Public fuel price dataset from data.gouv.fr
* OpenStreetMap (for enrichment: brand, services, opening hours)

### Ingestion

* Implement a data ingestion pipeline:

  * Fetch fuel data daily (at least once per day)
  * Fetch OSM data periodically (batch, not real-time)
  * Normalize and index into Elasticsearch
  * Handle partial updates if possible

### Enrichment

* Merge fuel data with OSM data using:

  * Geo-distance matching (< 50m)
  * Fuzzy matching on station name (optional)

### Storage Policy

* Keep **30 days of history only**
* Implement automatic data retention (Index Lifecycle Management)

---

## 🧠 Core Concept: Decision Engine

The system MUST compute the **best station**, not just list stations.

### Key Features

#### 1. Real Cost Calculation

Compute total cost:

* fuel cost
* travel cost (based on distance and consumption)

#### 2. Station Scoring System

Each station must have a **score (0–100)** based on:

* price
* distance
* data freshness
* availability (stock)
* services (from OSM)

Weights must be configurable via `.env`.

#### 3. Data Reliability

* Compute a `data_confidence_score`
* Penalize outdated prices
* Configurable freshness threshold

#### 4. Route Optimization

* Support "on the way" queries
* Filter stations along a route using geo queries

#### 5. Price History & Trends

* Store historical prices
* Compute trends:

  * increasing
  * decreasing
  * stable

#### 6. Smart Alerts (Design Phase)

* Price drop alerts
* Best station change alerts

---

## ⚡ Performance Requirements

* API response time target: **< 200ms**
* Optimize for:

  * Fast geospatial queries (geo_point, geo_distance)
  * Efficient indexing strategy
  * Minimal payload size

---

## 🗺️ Core Features

### Backend

* Fetch fuel stations
* Filter by:

  * Location (radius)
  * Fuel type
  * Price
* Compute:

  * total_cost
  * station score
  * recommendation
* Historical price tracking
* Efficient geolocation queries (Elasticsearch geo queries)

### Frontend

* Mobile-first design (priority)
* Responsive UI
* Interactive map with markers
* Display:

  * price
  * score
  * recommendation badge
* Filters:

  * fuel type
  * price
  * distance
* Smooth UX

---

## 🔍 Observability Requirements

### Mandatory Instrumentation

* All endpoints must be traced
* Elasticsearch queries must be instrumented
* External API calls must be traced

### Metrics

* Request latency
* Error rate
* Throughput
* Data ingestion duration
* Scoring computation time

### Logs

* Structured logs (JSON)
* Correlated with traces

### Configuration

* Observability must be **pluggable**
* No hard dependency on a single vendor

---

## 🧪 Development Workflow

* Git strategy: **Trunk-based development**
* Small, frequent commits
* Code must always be runnable

### Testing

* Unit tests required
* API tests required
* Critical paths must be covered
* Add tests for scoring logic and cost calculation

---

## 🔐 Configuration & Secrets

* All sensitive configuration MUST be stored in a `.env` file

* Includes:

  * Elasticsearch connection URL
  * Elasticsearch credentials
  * Scoring weights
  * Freshness thresholds
  * External API configs

* NEVER hardcode secrets

* Provide a `.env.example`

---

## 🐳 Docker Requirements

* Full project must run via Docker
* Include:

  * Backend service
  * Frontend service
  * Elasticsearch
* Use docker-compose

---

## 📏 Coding Standards

* Clean, maintainable, production-ready code
* Avoid unnecessary complexity
* Prefer explicit over implicit

---

## 🚫 Strict Rules

Claude MUST NOT:

* Invent APIs or data formats
* Assume undocumented behavior
* Ignore performance constraints
* Introduce unnecessary dependencies
* Generate untested or speculative code

If uncertain:
→ "I cannot confirm this"

---

## 🧠 Decision Guidelines

1. Prefer simplicity
2. Prefer performance
3. Prefer maintainability
4. Prefer open-source solutions

---

## 🚀 Initial Tasks

Claude should start by:

1. Designing the architecture
2. Defining the monorepo structure
3. Creating backend skeleton (FastAPI)
4. Designing Elasticsearch index (geo + time-based + scoring fields)
5. Implementing ingestion + enrichment pipeline
6. Adding OpenTelemetry instrumentation
7. Creating Docker setup
8. Creating frontend skeleton (Angular + Leaflet)
9. Implementing scoring engine

---

## 📌 Notes

* This project is observability-first
* Elasticsearch is the single source of truth
* The system must be extensible and production-ready
* The main value comes from **decision intelligence**, not raw data

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
