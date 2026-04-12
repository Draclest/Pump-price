"""
Brand Logos
===========
Maps normalized brand keys (from osm_enrichment._normalize_brand) to logo URLs.

Logo sources used (in order of preference):
  1. Official brand CDN / Wikipedia SVG (stable, high quality)
  2. Clearbit Logo API (fallback for less common brands)
  3. None — frontend falls back to a colored letter badge
"""

from typing import Optional

# Wikipedia/Wikimedia SVG logos — stable and licence-free (public domain / CC)
_WIKIPEDIA_BASE = "https://upload.wikimedia.org/wikipedia/commons"

BRAND_LOGOS: dict[str, str] = {
    "totalenergies": f"{_WIKIPEDIA_BASE}/thumb/a/a0/TotalEnergies_logo.svg/320px-TotalEnergies_logo.svg.png",
    "bp":            f"{_WIKIPEDIA_BASE}/thumb/7/74/BP_Helios_logo.svg/240px-BP_Helios_logo.svg.png",
    "shell":         f"{_WIKIPEDIA_BASE}/thumb/e/e8/Shell_logo.svg/240px-Shell_logo.svg.png",
    "esso":          f"{_WIKIPEDIA_BASE}/thumb/3/39/Esso_textlogo.svg/240px-Esso_textlogo.svg.png",
    "avia":          f"{_WIKIPEDIA_BASE}/thumb/b/b8/Avia_International_logo.svg/240px-Avia_International_logo.svg.png",
    "q8":            f"{_WIKIPEDIA_BASE}/thumb/c/c5/Q8_logo.svg/240px-Q8_logo.svg.png",
    "gulf":          f"{_WIKIPEDIA_BASE}/thumb/8/88/Gulf_Oil_logo.svg/240px-Gulf_Oil_logo.svg.png",
    "leclerc":       f"{_WIKIPEDIA_BASE}/thumb/e/ed/Logo_E.Leclerc_Sans_le_texte.svg/240px-Logo_E.Leclerc_Sans_le_texte.svg.png",
    "intermarche":   f"{_WIKIPEDIA_BASE}/thumb/2/2e/Logo_Intermarche.svg/320px-Logo_Intermarche.svg.png",
    "carrefour":     f"{_WIKIPEDIA_BASE}/thumb/5/5b/Carrefour_logo.svg/320px-Carrefour_logo.svg.png",
    "systeme-u":     f"{_WIKIPEDIA_BASE}/thumb/9/9e/Logo_Syst%C3%A8me_U.svg/240px-Logo_Syst%C3%A8me_U.svg.png",
    "auchan":        f"{_WIKIPEDIA_BASE}/thumb/c/c8/Auchan.svg/240px-Auchan.svg.png",
    "casino":        f"{_WIKIPEDIA_BASE}/thumb/c/c7/Logo_Casino.svg/240px-Logo_Casino.svg.png",
    "lidl":          f"{_WIKIPEDIA_BASE}/thumb/9/91/Lidl-Logo.svg/240px-Lidl-Logo.svg.png",
    "netto":         "https://logo.clearbit.com/netto.fr",
    "colruyt":       f"{_WIKIPEDIA_BASE}/thumb/0/04/Logo_colruyt.svg/240px-Logo_colruyt.svg.png",
    "agip":          f"{_WIKIPEDIA_BASE}/thumb/3/3c/Eni_logo.svg/240px-Eni_logo.svg.png",
    "dyneff":        "https://logo.clearbit.com/dyneff.com",
    "elan":          "https://logo.clearbit.com/elan-station.fr",
    "vito":          "https://logo.clearbit.com/vito.fr",
    "petroplus":     "https://logo.clearbit.com/petroplus.fr",
}

# Brand display names (human-readable, shown in UI)
BRAND_DISPLAY_NAMES: dict[str, str] = {
    "totalenergies": "TotalEnergies",
    "bp":            "BP",
    "shell":         "Shell",
    "esso":          "Esso",
    "avia":          "Avia",
    "q8":            "Q8",
    "gulf":          "Gulf",
    "leclerc":       "E.Leclerc",
    "intermarche":   "Intermarché",
    "carrefour":     "Carrefour",
    "systeme-u":     "Système U",
    "auchan":        "Auchan",
    "casino":        "Casino",
    "lidl":          "Lidl",
    "netto":         "Netto",
    "colruyt":       "Colruyt",
    "agip":          "Agip / Eni",
    "dyneff":        "Dyneff",
    "elan":          "Elan",
    "vito":          "Vito",
    "petroplus":     "Pétroplus",
}

# Brand accent colors (used as fallback badge background)
BRAND_COLORS: dict[str, str] = {
    "totalenergies": "#D00027",
    "bp":            "#007A3E",
    "shell":         "#FECC02",
    "esso":          "#C00",
    "avia":          "#003087",
    "q8":            "#004B99",
    "gulf":          "#EF7B00",
    "leclerc":       "#003087",
    "intermarche":   "#D7001B",
    "carrefour":     "#004A97",
    "systeme-u":     "#E30613",
    "auchan":        "#E30613",
    "casino":        "#E20025",
    "lidl":          "#0050AA",
}


def get_logo_url(brand_key: Optional[str]) -> Optional[str]:
    if not brand_key:
        return None
    return BRAND_LOGOS.get(brand_key)


def get_display_name(brand_key: Optional[str], fallback: Optional[str] = None) -> Optional[str]:
    if not brand_key:
        return fallback
    return BRAND_DISPLAY_NAMES.get(brand_key, fallback)


def get_brand_color(brand_key: Optional[str]) -> Optional[str]:
    if not brand_key:
        return None
    return BRAND_COLORS.get(brand_key)
