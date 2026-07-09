import json
from pathlib import Path

from cambodia_address import Address


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "frontend" / "src" / "data" / "cambodia_admin.json"


def main():
    address = Address()
    data = {
        "provinces": address.get_provinces(),
        "districts": address.get_districts(),
        "communes": address.get_communes(),
        "villages": address.get_villages(),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
        file.write("\n")

    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
