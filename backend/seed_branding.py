"""Restaurant branding — all images bundled on sumaya-web (never hotlink)."""

WEB = "https://sumaya-web.onrender.com"

MENU_SLUGS = {
    "Paneer Tikka": "paneer-tikka",
    "Dal Makhani": "dal-makhani",
    "Butter Naan": "butter-naan",
    "Lassi": "lassi",
    "Thali": "thali",
    "Biryani": "biryani",
    "Chaat": "chaat",
    "Kulfi": "kulfi",
    "Tandoori Chicken": "tandoori-chicken",
    "Palak Paneer": "palak-paneer",
    "Gulab Jamun": "gulab-jamun",
    "Masala Dosa": "masala-dosa",
    "Fish Amritsari": "biryani",
    "Mutton Rogan Josh": "dal-makhani",
    "Rasmalai": "gulab-jamun",
    "Papad": "butter-naan",
    "Coffee": "lassi",
    "Pasta": "thali",
    "Sandwich": "chaat",
    "Brownie": "kulfi",
    "Fish Curry": "biryani",
    "Appam": "masala-dosa",
    "Prawns Fry": "tandoori-chicken",
}


def asset(path: str) -> str:
    return f"{WEB}{path}"


def menu_image(name: str) -> str:
    slug = MENU_SLUGS.get(name, "thali")
    return asset(f"/images/menu/{slug}.jpg")


MENU_IMAGES = {name: menu_image(name) for name in MENU_SLUGS}

GALLERY_INDIAN = [asset(f"/images/gallery/{i}.jpg") for i in range(1, 7)]
HERO_INDIAN = asset("/images/gallery/hero.jpg")
LOGO_INDIAN = asset("/images/gallery/1.jpg")

RESTAURANT_BRANDING = {
    "spice-garden": {
        "logo_url": LOGO_INDIAN,
        "hero_image": HERO_INDIAN,
        "primary_color": "#B45309",
        "secondary_color": "#C9A227",
        "tagline": "Where every meal is a celebration",
        "description": "Spice Garden brings vibrant Indian fine dining to Ahmedabad — tandoor specials, rich curries, and celebration feasts across two stunning branches.",
        "gallery": GALLERY_INDIAN,
        "offers": [
            {"title": "Weekend Thali Special", "discount": "20% OFF", "desc": "Unlimited thali every Saturday & Sunday"},
            {"title": "Family Feast", "discount": "₹499", "desc": "4 curries + naan + dessert for four"},
            {"title": "Lunch Combo", "discount": "15% OFF", "desc": "Before 3 PM on weekdays"},
        ],
        "menu_images": {k: v for k, v in MENU_IMAGES.items() if k in (
            "Paneer Tikka", "Dal Makhani", "Butter Naan", "Lassi", "Thali", "Biryani",
            "Chaat", "Kulfi", "Tandoori Chicken", "Palak Paneer", "Gulab Jamun", "Masala Dosa",
            "Fish Amritsari", "Mutton Rogan Josh", "Rasmalai", "Papad",
        )},
        "supplier_catalog": [
            "Premium basmati rice, whole spices, and ghee",
            "Fresh dairy — paneer, cream, and cultured butter",
            "Seasonal vegetables from Gujarat farms",
            "Tandoor charcoal and kitchen fuel supply",
        ],
    },
    "urban-bowl": {
        "logo_url": asset("/images/menu/lassi.jpg"),
        "hero_image": asset("/images/gallery/4.jpg"),
        "primary_color": "#15803D",
        "secondary_color": "#B45309",
        "tagline": "Fresh bowls, great coffee",
        "description": "Urban Bowl Cafe — specialty coffee and wholesome bowls in Pune.",
        "gallery": GALLERY_INDIAN[:3],
        "offers": [{"title": "Morning Brew", "discount": "10% OFF", "desc": "Before 11 AM"}],
        "menu_images": {k: MENU_IMAGES[k] for k in ("Coffee", "Pasta", "Sandwich", "Brownie")},
        "supplier_catalog": ["Artisan coffee beans", "Fresh produce"],
    },
    "coastal-curry": {
        "logo_url": asset("/images/menu/biryani.jpg"),
        "hero_image": asset("/images/gallery/3.jpg"),
        "primary_color": "#0E7490",
        "secondary_color": "#F59E0B",
        "tagline": "Coastal flavours, Mumbai soul",
        "description": "Coastal Curry House — seafood and Kerala classics in Bandra.",
        "gallery": GALLERY_INDIAN[2:5],
        "offers": [{"title": "Seafood Friday", "discount": "15% OFF", "desc": "Fresh catch every Friday"}],
        "menu_images": {k: MENU_IMAGES[k] for k in ("Fish Curry", "Appam", "Prawns Fry")},
        "supplier_catalog": ["Daily seafood", "Coconut and spices"],
    },
}

PLATFORM_CMS_BLOCKS = [
    {
        "slug": "platform-hero",
        "title": "Run your restaurant. Delight every guest.",
        "body": "Sumaya Restro powers POS, kitchen, billing, inventory, and guest ordering for modern restaurants.",
        "image_url": HERO_INDIAN,
    },
]
