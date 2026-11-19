"""Refresh small code/name lists used by the Brreg query form (no company records)."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BRREG = 'https://data.brreg.no'
STOTTE = 'https://stottetiltak-registerinfo-api.app.brreg.no'
KLASS = 'https://data.ssb.no/api/klass/v1'


def get(url):
    with urlopen(Request(url, headers={'Accept': 'application/json'}), timeout=60) as response:
        return json.load(response)


def compact(rows, code='identifikator', label='navn'):
    return [{'code': str(row[code]), 'label': row.get(label, str(row[code]))} for row in rows]


if __name__ == '__main__':
    keys = ['statsstoettekategori', 'eosprimaerrettsliggrunnlag', 'stoetteinstrumenttype',
            'artikkeltype', 'retningslinjeesa', 'formaalstype', 'stoettegiver', 'region']
    with ThreadPoolExecutor(max_workers=4) as pool:
        responses = dict(zip(keys, pool.map(lambda key: get(STOTTE + '/api/v1/kodeliste/' + key), keys)))
    stotte = {key: compact(rows) for key, rows in responses.items() if key not in ['stoettegiver', 'region']}
    stotte['stoettegiver'] = compact(responses['stoettegiver'], 'organisasjonsnummer')
    # Search expects the county number, not the internal region identifier.
    stotte['region'] = list({row['fylkesnummer']: {'code': row['fylkesnummer'], 'label': row['navn']}
                             for row in responses['region']}.values())
    for standard in ['SN2007', 'SN2025']:
        stotte['naering' + standard] = compact(get(STOTTE + '/api/v1/kodeliste/naering?standard=' + standard), 'code', 'name')
    classification = get(KLASS + '/classifications/6')
    today = datetime.now(timezone.utc).date().isoformat()
    version = max((v for v in classification['versions'] if v['validFrom'] <= today
                   and (not v.get('validTo') or v['validTo'] > today)), key=lambda v: v['validFrom'])
    industries = get(KLASS + '/versions/' + str(version['id']))
    forms = get(BRREG + '/enhetsregisteret/api/organisasjonsformer')['_embedded']['organisasjonsformer']
    result = {'fetchedAt': datetime.now(timezone.utc).isoformat(),
              'organisationForms': compact(forms, 'kode', 'beskrivelse'),
              'industryStandard': version['name'], 'industryVersion': version['id'],
              'industries': compact([row for row in industries['classificationItems']
                                      if row['code'][0].isdigit()], 'code', 'name'), 'stotte': stotte}
    target = ROOT / 'data/brreg/codebooks.json'
    target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print('Saved', len(result['industries']), 'industry codes and', len(stotte), 'support code lists')
