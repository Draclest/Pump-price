"""
Tests unitaires du moteur de gain net — fonctions PURES, aucune I/O.

Fixtures déterministes reprises telles quelles du brief IMPLEMENTATION.md.
Toutes : consumption_l_100km = 5.6, time_value_eur_h = 10, seuils par défaut 0.5.
"""
import pytest

from app.services.net_gain import (
    NetGainInput,
    Preferences,
    Vehicle,
    compute_net_gain,
    confidence_from_age,
    resolve_fill_liters,
    verdict_for,
)


def _input(p_b, p_s, q, d_km, t_min):
    return NetGainInput(
        price_candidate=p_s,
        price_baseline=p_b,
        fill_liters=q,
        consumption_l_100km=5.6,
        detour_km=d_km,
        detour_min=t_min,
        time_value_eur_h=10.0,
    )


# ── compute_net_gain : fixtures A / B / C ────────────────────────────────────

@pytest.mark.parametrize(
    "p_b,p_s,q,d_km,t_min,pump,detour,time,net,verdict",
    [
        (1.879, 1.799, 42, 2.4, 5, 3.36, 0.24, 0.83,  2.28, "worth_it"),  # A
        (1.829, 1.799, 40, 6.0, 9, 1.20, 0.60, 1.50, -0.90, "skip"),      # B
        (1.839, 1.799, 40, 3.0, 5, 1.60, 0.30, 0.83,  0.46, "neutral"),   # C
    ],
)
def test_compute_net_gain_fixtures(p_b, p_s, q, d_km, t_min, pump, detour, time, net, verdict):
    res = compute_net_gain(_input(p_b, p_s, q, d_km, t_min))
    assert res.breakdown.pump_saving_eur == pump
    assert res.breakdown.detour_fuel_eur == detour
    assert res.breakdown.time_cost_eur == time
    assert res.net_gain_eur == net
    assert res.verdict == verdict


def test_net_gain_negative_is_returned_not_clamped():
    """Le faux bon plan (net négatif) est renvoyé avec verdict skip — c'est la valeur."""
    res = compute_net_gain(_input(1.829, 1.799, 40, 6.0, 9))
    assert res.net_gain_eur < 0
    assert res.verdict == "skip"


def test_custom_thresholds_shift_verdict():
    res = compute_net_gain(_input(1.839, 1.799, 40, 3.0, 5), thresholds=(0.4, 0.4))
    assert res.net_gain_eur == 0.46
    assert res.verdict == "worth_it"  # 0.46 ≥ 0.4


# ── verdict_for ──────────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "net,expected",
    [(0.5, "worth_it"), (0.49, "neutral"), (0.0, "neutral"),
     (-0.49, "neutral"), (-0.5, "skip"), (3.0, "worth_it")],
)
def test_verdict_for_boundaries(net, expected):
    assert verdict_for(net) == expected


# ── resolve_fill_liters ──────────────────────────────────────────────────────

def test_fill_liters_full_tank_from_current_level():
    v = Vehicle(fuel="gazole", consumption_l_100km=5.6, tank_capacity_l=50, current_level_l=8)
    assert resolve_fill_liters(v, Preferences()) == 42


def test_fill_liters_default_three_quarters_when_unknown():
    v = Vehicle(fuel="gazole", consumption_l_100km=5.6, tank_capacity_l=50)
    assert resolve_fill_liters(v, Preferences()) == 37.5


def test_fill_liters_explicit_target_wins():
    v = Vehicle(fuel="gazole", consumption_l_100km=5.6, tank_capacity_l=50, current_level_l=8)
    assert resolve_fill_liters(v, Preferences(fill_target_l=30)) == 30


# ── confidence_from_age ──────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "age_min,expected",
    [(95, "high"), (600, "medium"), (2000, "low"), (5000, "stale")],
)
def test_confidence_from_age(age_min, expected):
    assert confidence_from_age(age_min) == expected
