# Claude.md — Open Project Pump Price

## 🧭 Project Overview

**Name:** Open Project - Pump Price
**Goal:** Display fuel prices on an interactive map using public data from data.gouv.fr.
**Audience:** General public
**Problem Solved:** Help users find the cheapest fuel nearby quickly and reliably.

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

### Behavior

* Always act, do not wait for instructions unless ambiguity blocks progress
* Ask clarifying questions when needed
* Propose multiple technical options when relevant
* Justify technical decisions

---

## 📦 Data Management

### Source

* Public fuel price dataset from data.gouv.fr
* Updated regularly

### Ingestion

* Implement a data ingestion pipeline:

  * Fetch data daily (at least once per day)
  * Normalize and index into Elasticsearch
  * Handle partial updates if possible

### Storage Policy

* Keep **30 days of history only**
* Implement automatic data retention (index lifecycle management preferred)

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
* Historical price tracking
* Efficient geolocation queries (Elasticsearch geo queries)

### Frontend

* Mobile-first design (priority)
* Responsive UI (optimized for smartphones first, then desktop)
* Interactive map with markers
* Price display per station
* Filters (fuel type, price, distance)
* Smooth UX (fast loading, minimal lag)

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

---

## 🔐 Configuration & Secrets

* All sensitive configuration MUST be stored in a `.env` file
* Includes:

  * Elasticsearch connection URL
  * Elasticsearch credentials (username/password or API key)
  * Any future external API keys
* The application must load configuration via environment variables
* NEVER hardcode secrets in the codebase
* Provide a `.env.example` file for documentation

---

## 🐳 Docker Requirements

* Full project must run via Docker
* Include:

  * Backend service
  * Frontend service
  * Elasticsearch
* Use docker-compose for local orchestration

---

## 📏 Coding Standards

* Follow standard best practices for each language
* Write clean, maintainable, production-ready code
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
→ Explicitly state: "I cannot confirm this"

---

## 🧠 Decision Guidelines

When multiple solutions exist:

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
4. Designing Elasticsearch index (mapping + geo_point + time-based data)
5. Implementing data ingestion pipeline
6. Adding OpenTelemetry instrumentation
7. Creating Docker setup
8. Creating frontend skeleton (Angular + Leaflet)

---

## 📌 Notes

* This project is observability-first
* Code quality and performance are critical
* The system must be extensible and production-ready
* Elasticsearch is the single source of truth for search and historical data

---
