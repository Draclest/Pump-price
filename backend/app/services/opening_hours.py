"""
Opening Hours Parser
====================
Parses the OSM `opening_hours` tag to determine whether a fuel station
is currently open.

Supported formats (covers >95 % of French OSM fuel stations):
  - "24/7"                               → always open
  - "Mo-Su 06:00-22:00"                  → same hours every day
  - "Mo-Fr 07:00-21:00; Sa-Su 08:00-20:00"
  - "Mo-Fr 07:00-20:00; Sa 08:00-18:00; Su off"
  - "off"                                → always closed
  - any rule with "PH" (public holiday) is ignored (treated as unknown)

Returns True / False / None (unknown format or parse error).
"""

import re
from datetime import datetime, timezone
from typing import Optional

# OSM day abbreviations → weekday index (Monday = 0)
_DAY_MAP = {
    "mo": 0, "tu": 1, "we": 2, "th": 3, "fr": 4, "sa": 5, "su": 6,
}

_ALL_DAYS = list(range(7))


def _expand_days(token: str) -> list[int]:
    """'Mo-Fr' → [0,1,2,3,4]  |  'Sa' → [5]  |  'Mo,We,Fr' → [0,2,4]"""
    token = token.strip().lower()
    days = []
    for part in token.split(","):
        part = part.strip()
        if "-" in part:
            a, b = part.split("-", 1)
            a_idx = _DAY_MAP.get(a.strip())
            b_idx = _DAY_MAP.get(b.strip())
            if a_idx is not None and b_idx is not None:
                # Handle Mo-Su wrap-around
                if b_idx >= a_idx:
                    days.extend(range(a_idx, b_idx + 1))
                else:
                    days.extend(range(a_idx, 7))
                    days.extend(range(0, b_idx + 1))
        else:
            idx = _DAY_MAP.get(part)
            if idx is not None:
                days.append(idx)
    return days


def _parse_time(s: str) -> Optional[int]:
    """'06:00' → 360 (minutes since midnight)"""
    m = re.match(r"(\d{1,2}):(\d{2})", s.strip())
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2))


def _rule_matches_now(rule: str, weekday: int, minutes: int) -> Optional[bool]:
    """
    Parse one OSM rule like 'Mo-Fr 07:00-21:00' or 'Sa off'.
    Returns True (open), False (closed/off), None (cannot parse).
    """
    rule = rule.strip()
    if not rule:
        return None

    # Skip public-holiday rules
    if "ph" in rule.lower():
        return None

    # Split days from time range
    # Pattern: <days_token> <time_range> OR just <days_token> off
    m = re.match(
        r"^([A-Za-z, \-]+)\s+(off|closed|\d{1,2}:\d{2}-\d{1,2}:\d{2}(?:,\d{1,2}:\d{2}-\d{1,2}:\d{2})*)$",
        rule,
    )
    if not m:
        return None

    days_token = m.group(1).strip()
    time_token = m.group(2).strip()

    applicable_days = _expand_days(days_token) if days_token else _ALL_DAYS
    if not applicable_days or weekday not in applicable_days:
        return None   # rule doesn't apply today

    if time_token.lower() in ("off", "closed"):
        return False

    # One or more time ranges (e.g., "06:00-12:00,14:00-20:00")
    for tr in time_token.split(","):
        tr = tr.strip()
        parts = tr.split("-")
        if len(parts) != 2:
            continue
        start = _parse_time(parts[0])
        end   = _parse_time(parts[1])
        if start is None or end is None:
            continue
        if end < start:          # overnight range like 22:00-02:00
            if minutes >= start or minutes < end:
                return True
        else:
            if start <= minutes < end:
                return True

    return False   # today is applicable but current time is outside all ranges


def is_open_now(opening_hours: Optional[str]) -> Optional[bool]:
    """
    Return True if the station is currently open, False if closed,
    None if the format is unknown or unparseable.

    Uses the system's local time.
    """
    if not opening_hours:
        return None

    oh = opening_hours.strip()

    # 24/7
    if oh.lower() in ("24/7", "00:00-24:00", "00:00-00:00"):
        return True

    # Purely "off"
    if oh.lower() in ("off", "closed"):
        return False

    now = datetime.now()          # local time
    weekday = now.weekday()       # Monday=0
    minutes = now.hour * 60 + now.minute

    # Split into semicolon-separated rules
    rules = [r.strip() for r in oh.split(";")]

    # Evaluate rules in order; last matching rule wins (OSM convention)
    result: Optional[bool] = None
    for rule in rules:
        r = _rule_matches_now(rule, weekday, minutes)
        if r is not None:
            result = r

    return result


def format_opening_hours(opening_hours: Optional[str]) -> Optional[str]:
    """Return a display-friendly version of the opening_hours string."""
    if not opening_hours:
        return None
    oh = opening_hours.strip()
    if oh.lower() == "24/7":
        return "Ouvert 24h/24"
    # Replace day abbreviations with French
    translations = {
        r"\bMo\b": "Lun", r"\bTu\b": "Mar", r"\bWe\b": "Mer",
        r"\bTh\b": "Jeu", r"\bFr\b": "Ven", r"\bSa\b": "Sam", r"\bSu\b": "Dim",
        r"\boff\b": "Fermé",
    }
    import re
    result = oh
    for pattern, repl in translations.items():
        result = re.sub(pattern, repl, result, flags=re.IGNORECASE)
    return result
