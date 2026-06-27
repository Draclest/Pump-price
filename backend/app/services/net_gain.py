"""
Moteur de gain net personnalisé — cœur de calcul PUR (aucune I/O).

Passe du *prix affiché* au *coût net réel* : pour une voiture, un trajet et un
réservoir donnés, combien on gagne (ou perd, signé) en € en allant faire le
plein à une station candidate plutôt qu'à la baseline. C'est l'anti-faux-bon-plan.

Spec : spec-moteur-gain-net.md §4 · Brief : IMPLEMENTATION.md (contrats T1).
Toute la logique ici est testable isolément (cf. tests/test_net_gain.py) — aucun
accès ES / OSRM. L'I/O vit dans net_gain_service / repositories / clients.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal, Optional

Fuel       = Literal["sp95_e10", "sp98", "gazole", "e85", "gplc"]
Verdict    = Literal["worth_it", "neutral", "skip"]
Confidence = Literal["high", "medium", "low", "stale"]

# Seuils par défaut de la zone morte du verdict (§9.1 / §11).
DEFAULT_POSITIVE_THRESHOLD_EUR = 0.5
DEFAULT_NEGATIVE_THRESHOLD_EUR = 0.5


# ── Entrées / sorties (contrats IMPLEMENTATION.md, snake_case Python) ──────────

@dataclass(frozen=True)
class Vehicle:
    fuel: Fuel
    consumption_l_100km: float
    tank_capacity_l: float
    current_level_l: Optional[float] = None


@dataclass(frozen=True)
class Preferences:
    time_value_eur_h: float = 0.0           # 0 = on ignore le temps, seul le carburant compte
    max_detour_min: float = 10.0            # filtre dur (appliqué dans le service)
    max_price_age_h: float = 72.0
    fill_target_l: Optional[float] = None   # None => plein complet calculé
    urban_consumption_factor: float = 1.0
    positive_threshold_eur: float = DEFAULT_POSITIVE_THRESHOLD_EUR
    negative_threshold_eur: float = DEFAULT_NEGATIVE_THRESHOLD_EUR


@dataclass(frozen=True)
class NetGainInput:
    price_candidate: float      # p_s €/L
    price_baseline: float       # p_b €/L
    fill_liters: float          # Q
    consumption_l_100km: float  # conso EFFECTIVE (facteur urbain déjà appliqué)
    detour_km: float            # d_s, détour marginal
    detour_min: float           # t_s, détour marginal
    time_value_eur_h: float     # vt


@dataclass(frozen=True)
class NetGainBreakdown:
    pump_saving_eur: float      # (p_b - p_s) * Q
    detour_fuel_eur: float      # (d_s * cons/100) * p_s
    time_cost_eur: float        # (t_s/60) * vt


@dataclass(frozen=True)
class NetGainResult:
    net_gain_eur: float         # pump_saving - detour_fuel - time_cost
    verdict: Verdict
    breakdown: NetGainBreakdown


# ── Fonctions pures ───────────────────────────────────────────────────────────

def _round2(x: float) -> float:
    """Arrondi half-up à 2 décimales (§ Brief : pas l'arrondi bancaire de round())."""
    return float(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def verdict_for(
    net_gain: float,
    positive_eur: float = DEFAULT_POSITIVE_THRESHOLD_EUR,
    negative_eur: float = DEFAULT_NEGATIVE_THRESHOLD_EUR,
) -> Verdict:
    """Verdict sur le gain net en PLEINE précision (pas la valeur arrondie de sortie)."""
    if net_gain >= positive_eur:
        return "worth_it"
    if net_gain <= -negative_eur:
        return "skip"
    return "neutral"


def compute_net_gain(
    inp: NetGainInput,
    thresholds: Optional[tuple[float, float]] = None,
) -> NetGainResult:
    """
    gain_net = econ_pompe − coût_détour_carburant − coût_temps   (signé).

    `thresholds` = (positive_eur, negative_eur) ; None => seuils par défaut 0.5.
    Calcul en pleine précision ; arrondi half-up 2 décimales sur les sorties
    uniquement (la somme du breakdown peut différer du net d'1 centime — attendu).
    """
    positive_eur, negative_eur = thresholds or (
        DEFAULT_POSITIVE_THRESHOLD_EUR,
        DEFAULT_NEGATIVE_THRESHOLD_EUR,
    )

    pump_saving = (inp.price_baseline - inp.price_candidate) * inp.fill_liters
    detour_fuel = (inp.detour_km * inp.consumption_l_100km / 100.0) * inp.price_candidate
    time_cost   = (inp.detour_min / 60.0) * inp.time_value_eur_h
    net         = pump_saving - detour_fuel - time_cost

    return NetGainResult(
        net_gain_eur=_round2(net),
        verdict=verdict_for(net, positive_eur, negative_eur),
        breakdown=NetGainBreakdown(
            pump_saving_eur=_round2(pump_saving),
            detour_fuel_eur=_round2(detour_fuel),
            time_cost_eur=_round2(time_cost),
        ),
    )


def resolve_fill_liters(vehicle: Vehicle, prefs: Preferences) -> float:
    """
    Litres effectivement achetés au plein (§5.1) :
      - fill_target_l fourni      -> fill_target_l ;
      - sinon current_level_l connu -> tank - current (plein complet) ;
      - sinon                      -> tank * 0.75 (hypothèse réservoir au quart).
    """
    if prefs.fill_target_l is not None:
        return prefs.fill_target_l
    if vehicle.current_level_l is not None:
        return vehicle.tank_capacity_l - vehicle.current_level_l
    return vehicle.tank_capacity_l * 0.75


def confidence_from_age(age_minutes: float) -> Confidence:
    """Fraîcheur du prix (§9.2) : <6h high · 6–24h medium · 24–72h low · >72h stale."""
    if age_minutes < 6 * 60:
        return "high"
    if age_minutes < 24 * 60:
        return "medium"
    if age_minutes <= 72 * 60:
        return "low"
    return "stale"
