"""Geospatial helpers. Location provider abstraction — currently uses simple
haversine distance so we can swap in Google Maps / Mapbox later without
touching business logic."""
from math import radians, sin, cos, asin, sqrt
from typing import List, Optional, Dict, Any


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in kilometres."""
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * r * asin(sqrt(a))


class LocationProvider:
    """Abstract provider — switch to Google Maps by implementing this interface."""

    def distance_km(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        raise NotImplementedError

    def nearest(self, lat: float, lng: float, candidates: List[Dict[str, Any]],
                lat_key: str = "lat", lng_key: str = "lng",
                radius_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
        raise NotImplementedError


class OSMLocationProvider(LocationProvider):
    """OpenStreetMap-friendly implementation using pure haversine.
    Works offline, no API key. Same interface can later back onto Google Maps."""

    def distance_km(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        return haversine_km(lat1, lng1, lat2, lng2)

    def nearest(self, lat: float, lng: float, candidates: List[Dict[str, Any]],
                lat_key: str = "lat", lng_key: str = "lng",
                radius_key: Optional[str] = None) -> Optional[Dict[str, Any]]:
        best = None
        best_d = float("inf")
        for c in candidates:
            if c.get(lat_key) is None or c.get(lng_key) is None:
                continue
            d = self.distance_km(lat, lng, c[lat_key], c[lng_key])
            if radius_key and c.get(radius_key) is not None and d > c[radius_key]:
                continue
            if d < best_d:
                best_d = d
                best = {**c, "_distance_km": round(d, 2)}
        return best


location_provider: LocationProvider = OSMLocationProvider()
