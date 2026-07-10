"""Idempotent patches applied on API startup (menu images, etc.)."""
from sqlalchemy import select

from app.models import MenuItem, Restaurant, Tenant

from seed_branding import MENU_IMAGES, RESTAURANT_BRANDING, menu_image

DEFAULT_FOOD_IMAGE = menu_image("Thali")


async def patch_menu_images(db) -> int:
    """Ensure every menu item uses bundled sumaya-web image URLs."""
    result = await db.execute(
        select(MenuItem, Restaurant.slug).join(Restaurant, MenuItem.restaurant_id == Restaurant.id)
    )
    updated = 0
    for item, slug in result.all():
        brand = RESTAURANT_BRANDING.get(slug, {})
        imgs = {**MENU_IMAGES, **brand.get("menu_images", {})}
        target = imgs.get(item.name) or menu_image(item.name)
        if item.image_url != target:
            item.image_url = target
            updated += 1
    if updated:
        await db.flush()
    return updated


async def patch_tenant_branding(db) -> int:
    """Refresh tenant settings (hero, gallery, offers) with bundled image URLs."""
    result = await db.execute(select(Tenant))
    updated = 0
    for tenant in result.scalars().all():
        brand = RESTAURANT_BRANDING.get(tenant.slug, {})
        if not brand:
            continue
        settings = dict(tenant.settings or {})
        changed = False
        for key in ("tagline", "hero_image", "gallery", "offers"):
            if brand.get(key) is not None and settings.get(key) != brand.get(key):
                settings[key] = brand[key]
                changed = True
        if brand.get("logo_url") and tenant.logo_url != brand["logo_url"]:
            tenant.logo_url = brand["logo_url"]
            changed = True
        if brand.get("primary_color"):
            tenant.primary_color = brand["primary_color"]
        if brand.get("secondary_color"):
            tenant.secondary_color = brand["secondary_color"]
        if changed:
            tenant.settings = settings
            updated += 1
    if updated:
        await db.flush()
    return updated
