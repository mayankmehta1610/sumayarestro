"""Restaurant branding, images, CMS and supplier copy for demo tenants."""

# Wikimedia Commons — stable hotlinking (Unsplash often blocks in production/embeds).
_W = "https://upload.wikimedia.org/wikipedia/commons/thumb"
MENU_IMAGES = {
    "Paneer Tikka": f"{_W}/6/64/Paneer_Tikka.jpg/400px-Paneer_Tikka.jpg",
    "Dal Makhani": f"{_W}/f/f6/Dal_Makhani.jpg/400px-Dal_Makhani.jpg",
    "Butter Naan": f"{_W}/0/0a/Naan_bread.jpg/400px-Naan_bread.jpg",
    "Lassi": f"{_W}/5/5a/Mango_lassi.jpg/400px-Mango_lassi.jpg",
    "Thali": f"{_W}/9/9e/Indian_thali.jpg/400px-Indian_thali.jpg",
    "Biryani": f"{_W}/4/4f/Biryani_in_Kolkata.jpg/400px-Biryani_in_Kolkata.jpg",
    "Chaat": f"{_W}/8/8e/Chaat_mumbai.jpg/400px-Chaat_mumbai.jpg",
    "Kulfi": f"{_W}/4/4c/Kulfi.jpg/400px-Kulfi.jpg",
    "Tandoori Chicken": f"{_W}/2/2c/Tandoori_chicken.jpg/400px-Tandoori_chicken.jpg",
    "Palak Paneer": f"{_W}/6/6f/Palak_Paneer.jpg/400px-Palak_Paneer.jpg",
    "Gulab Jamun": f"{_W}/2/2f/Gulab_jamun.jpg/400px-Gulab_jamun.jpg",
    "Masala Dosa": f"{_W}/8/8f/Masala_dosa.jpg/400px-Masala_dosa.jpg",
    "Fish Amritsari": f"{_W}/1/1e/Fried_fish_and_chips.jpg/400px-Fried_fish_and_chips.jpg",
    "Mutton Rogan Josh": f"{_W}/7/7d/Rogan_josh.jpg/400px-Rogan_josh.jpg",
    "Rasmalai": f"{_W}/5/5f/Ras_Malai.jpg/400px-Ras_Malai.jpg",
    "Papad": f"{_W}/8/8d/Papadum.jpg/400px-Papadum.jpg",
    "Coffee": f"{_W}/4/45/A_small_cup_of_coffee.JPG/400px-A_small_cup_of_coffee.JPG",
    "Pasta": f"{_W}/7/7d/Pasta_%28generic%29.jpg/400px-Pasta_%28generic%29.jpg",
    "Sandwich": f"{_W}/6/6e/Sandwich.jpg/400px-Sandwich.jpg",
    "Brownie": f"{_W}/9/9a/Brownie_%28confectionery%29.jpg/400px-Brownie_%28confectionery%29.jpg",
    "Fish Curry": f"{_W}/3/3f/Fish_curry.jpg/400px-Fish_curry.jpg",
    "Appam": f"{_W}/5/5a/Appam_%28food%29.jpg/400px-Appam_%28food%29.jpg",
    "Prawns Fry": f"{_W}/2/2a/Fried_prawns.jpg/400px-Fried_prawns.jpg",
}

HERO_INDIAN = f"{_W}/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1280px-Good_Food_Display_-_NCI_Visuals_Online.jpg"
GALLERY_INDIAN = [
    f"{_W}/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/800px-Good_Food_Display_-_NCI_Visuals_Online.jpg",
    f"{_W}/4/4f/Biryani_in_Kolkata.jpg/800px-Biryani_in_Kolkata.jpg",
    f"{_W}/6/64/Paneer_Tikka.jpg/800px-Paneer_Tikka.jpg",
    f"{_W}/2/2c/Tandoori_chicken.jpg/800px-Tandoori_chicken.jpg",
    f"{_W}/8/8f/Masala_dosa.jpg/800px-Masala_dosa.jpg",
    f"{_W}/9/9e/Indian_thali.jpg/800px-Indian_thali.jpg",
]

RESTAURANT_BRANDING = {
    "spice-garden": {
        "logo_url": f"{_W}/6/64/Paneer_Tikka.jpg/200px-Paneer_Tikka.jpg",
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
        "menu_images": MENU_IMAGES,
        "supplier_catalog": [
            "Premium basmati rice, whole spices, and ghee",
            "Fresh dairy — paneer, cream, and cultured butter",
            "Seasonal vegetables from Gujarat farms",
            "Tandoor charcoal and kitchen fuel supply",
        ],
    },
    "urban-bowl": {
        "logo_url": MENU_IMAGES["Coffee"],
        "hero_image": f"{_W}/4/45/A_small_cup_of_coffee.JPG/1280px-A_small_cup_of_coffee.JPG",
        "primary_color": "#15803D",
        "secondary_color": "#B45309",
        "tagline": "Fresh bowls, great coffee",
        "description": "Urban Bowl Cafe — specialty coffee and wholesome bowls in Pune.",
        "gallery": [
            MENU_IMAGES["Coffee"],
            MENU_IMAGES["Pasta"],
            MENU_IMAGES["Sandwich"],
        ],
        "offers": [
            {"title": "Morning Brew", "discount": "10% OFF", "desc": "Before 11 AM"},
        ],
        "menu_images": {k: MENU_IMAGES[k] for k in ("Coffee", "Pasta", "Sandwich", "Brownie")},
        "supplier_catalog": ["Artisan coffee beans", "Fresh produce"],
    },
    "coastal-curry": {
        "logo_url": MENU_IMAGES["Fish Curry"],
        "hero_image": f"{_W}/3/3f/Fish_curry.jpg/1280px-Fish_curry.jpg",
        "primary_color": "#0E7490",
        "secondary_color": "#F59E0B",
        "tagline": "Coastal flavours, Mumbai soul",
        "description": "Coastal Curry House — seafood and Kerala classics in Bandra.",
        "gallery": [MENU_IMAGES["Fish Curry"], MENU_IMAGES["Appam"], MENU_IMAGES["Prawns Fry"]],
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
