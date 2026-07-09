import json
import re
import urllib.request
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "src" / "data" / "cambodia_admin.json"
SOURCE_URL = "https://db.ncdd.gov.kh/gazetteer/view/index.castle"


def clean_text(value):
    return unescape(re.sub(r"<.*?>", "", value)).strip()


def fetch_detail(endpoint, payload):
    return urllib.request.urlopen(
        f"https://db.ncdd.gov.kh/gazetteer/view/{endpoint}.castle",
        data=payload.encode(),
        timeout=30,
    ).read().decode("utf-8", "ignore")


def extract_summary_value(html, label):
    match = re.search(
        rf"<td[^>]*>\s*(?:&nbsp;)?{label}\s*</td>\s*<td>(.*?)</td>",
        html,
        flags=re.DOTALL,
    )
    return clean_text(match.group(1)) if match else ""


def last_path_part(value):
    return value.split("/")[-1].strip()


def fetch_area_label(endpoint, param_name, item_id):
    html = fetch_detail(endpoint, f"{param_name}={item_id}")
    return last_path_part(extract_summary_value(html, "Khmer"))


def fetch_commune_detail(commune_id):
    html = fetch_detail("commune", f"cm={commune_id}")
    commune_label = last_path_part(extract_summary_value(html, "Khmer"))

    rows = re.findall(
        r"<td class='cc'>\d+</td>\s*<td>(.*?)</td>\s*<td>(.*?)</td>",
        html,
        flags=re.DOTALL,
    )

    villages = []
    labels = {}
    for khmer, english in rows:
        english_name = clean_text(english)
        khmer_name = clean_text(khmer)
        if not english_name:
            continue
        villages.append(english_name)
        if khmer_name:
            labels[english_name] = khmer_name

    return commune_label, villages, labels


def main():
    html = urllib.request.urlopen(SOURCE_URL, timeout=30).read().decode("utf-8", "ignore")
    tree_html = html.split("<td id='content'", 1)[0]

    province_re = re.compile(r"loadDistrict\('(\d+)'\);\">([^<]+)</span>")
    district_re = re.compile(r"loadCommune\('(\d+)'\);\">([^<]+)</span>")
    commune_re = re.compile(r"loadVillage\('(\d+)'\); return false;\">([^<]+)</a>")

    data = {
        "provinces": [],
        "districts": {},
        "communes": {},
        "villages": {},
        "labels": {
            "Cambodia": "កម្ពុជា",
        },
    }
    current_province = None
    current_district = None

    for line in tree_html.splitlines():
        province = province_re.search(line)
        if province:
            province_id = province.group(1)
            current_province = province.group(2).strip()
            current_district = None
            data["provinces"].append(current_province)
            data["districts"][current_province] = []
            data["labels"][current_province] = fetch_area_label("province", "pv", province_id)
            continue

        district = district_re.search(line)
        if district and current_province:
            district_id = district.group(1)
            current_district = district.group(2).strip()
            district_key = f"{current_province}|{current_district}"
            data["districts"][current_province].append(current_district)
            data["communes"][district_key] = []
            district_label = fetch_area_label("district", "ds", district_id)
            data["labels"][current_district] = district_label
            data["labels"][district_key] = district_label
            continue

        commune = commune_re.search(line)
        if commune and current_district:
            commune_id = commune.group(1)
            commune_name = commune.group(2).strip()
            commune_key = f"{current_province}|{current_district}|{commune_name}"
            data["communes"][f"{current_province}|{current_district}"].append(commune_name)
            commune_label, villages, village_labels = fetch_commune_detail(commune_id)
            data["labels"][commune_name] = commune_label
            data["labels"][commune_key] = commune_label
            data["villages"][commune_key] = villages
            for village_name, village_label in village_labels.items():
                data["labels"][village_name] = village_label
                data["labels"][f"{commune_key}|{village_name}"] = village_label

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        f"Wrote {OUTPUT} "
        f"({len(data['provinces'])} provinces, "
        f"{sum(len(items) for items in data['districts'].values())} districts, "
        f"{sum(len(items) for items in data['communes'].values())} communes, "
        f"{sum(len(items) for items in data['villages'].values())} villages, "
        f"{len(data['labels'])} labels)"
    )


if __name__ == "__main__":
    main()
