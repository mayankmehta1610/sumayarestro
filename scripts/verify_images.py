"""Verify bundled gallery and menu images are reachable on production web + API branding."""
import json
import os
import sys
import urllib.error
import urllib.request

WEB = os.environ.get("VERIFY_WEB", "https://sumaya-web.onrender.com")
API = os.environ.get("VERIFY_API", "https://sumaya-api.onrender.com/api/v1")
SLUG = "spice-garden"

GALLERY = [f"/images/gallery/{i}.jpg" for i in range(1, 7)] + ["/images/gallery/hero.jpg"]
MENU = [
    "paneer-tikka", "dal-makhani", "butter-naan", "lassi", "thali", "biryani",
    "chaat", "kulfi", "tandoori-chicken", "palak-paneer", "gulab-jamun", "masala-dosa",
]


def head_ok(url: str) -> tuple[bool, str]:
    req = urllib.request.Request(url, method="HEAD")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status == 200, str(r.status)
    except urllib.error.HTTPError as e:
        return False, str(e.code)
    except Exception as e:
        return False, str(e)


def get_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read())


def main() -> int:
    failed = []

    print(f"Checking static assets on {WEB}...")
    for path in GALLERY + [f"/images/menu/{s}.jpg" for s in MENU]:
        ok, detail = head_ok(WEB + path)
        status = "OK" if ok else f"FAIL ({detail})"
        print(f"  {path}: {status}")
        if not ok:
            failed.append(path)

    print(f"\nChecking tenant branding for {SLUG}...")
    try:
        tenant = get_json(f"{API}/public/restaurants/{SLUG}")
        settings = tenant.get("settings") or {}
        hero = settings.get("hero_image") or tenant.get("hero_image")
        gallery = settings.get("gallery") or []
        print(f"  hero_image: {hero}")
        print(f"  gallery count: {len(gallery)}")
        for i, url in enumerate(gallery[:6]):
            bad = any(h in str(url) for h in ("unsplash.com", "wikimedia.org", "loremflickr.com"))
            print(f"    [{i}] {'BAD hotlink' if bad else 'OK'}: {url}")
            if bad:
                failed.append(f"gallery[{i}]")
        if len(gallery) < 6:
            failed.append("gallery<6")
    except Exception as e:
        print(f"  FAIL: {e}")
        failed.append("tenant-api")

    if failed:
        print(f"\nFAILED: {', '.join(failed)}")
        return 1
    print("\nAll image checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
