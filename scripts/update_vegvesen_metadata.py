"""Oppdater offentlig stasjonsoversikt for Vegvesenets Trafikkdata-API."""

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import urllib.request
import os

API = 'https://trafikkdata-api.atlas.vegvesen.no/'
QUERY = '''{ trafficRegistrationPoints {
  id name trafficRegistrationType operationalStatus registrationFrequency
  dataTimeSpan { firstData latestData { volumeByHour volumeByDay } }
  location {
    county { number name } municipality { number name }
    coordinates { latLon { lat lon } }
    roadReference { shortForm roadCategory { id name } }
  }
} }'''


def main():
    request = urllib.request.Request(API, data=json.dumps({'query': QUERY}).encode(), headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=120) as response:
        payload = json.load(response)
    if payload.get('errors'):
        raise ValueError('GraphQL-feil: ' + json.dumps(payload['errors'], ensure_ascii=False))
    points = payload['data']['trafficRegistrationPoints']
    if not points:
        raise ValueError('Tom stasjonsoversikt. Eksisterende metadata beholdes.')
    stations = []
    for point in points:
        location = point['location']
        road = location.get('roadReference') or {}
        span = point['dataTimeSpan']
        stations.append({
            'id': point['id'], 'name': point['name'], 'trafficType': point['trafficRegistrationType'],
            'status': point['operationalStatus'], 'frequency': point['registrationFrequency'],
            'county': location.get('county'), 'municipality': location.get('municipality'),
            'road': road.get('shortForm', ''), 'roadCategory': (road.get('roadCategory') or {}).get('id', ''),
            'coordinates': location['coordinates']['latLon'], 'firstData': span.get('firstData'),
            'latestHour': span['latestData'].get('volumeByHour'), 'latestDay': span['latestData'].get('volumeByDay'),
        })
    if len({point['id'] for point in stations}) != len(stations):
        raise ValueError('Duplikate stasjons-ID-er fra Vegvesenet.')
    stations.sort(key=lambda point: point['name'].casefold())
    document = {'version': 1, 'fetchedAt': datetime.now(timezone.utc).isoformat(), 'source': API, 'stations': stations}
    target = Path(__file__).resolve().parents[1] / 'data' / 'vegvesen' / 'stations.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=target.parent, delete=False) as handle:
        json.dump(document, handle, ensure_ascii=False, separators=(',', ':'))
        handle.write('\n')
        temporary = handle.name
    try:
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    print(f'Oppdatert {len(stations)} målestasjoner. Ingen commit eller push er utført.')


if __name__ == '__main__':
    main()
