"""Idempotent patches applied on API startup (menu images, etc.)."""
from sqlalchemy import select

from app.models import MenuItem, Restaurant, Tenant

from seed_branding import MENU_IMAGES, RESTAURANT_BRANDING

DEFAULT_FOOD_IMAGE = MENU_IMAGES["Thali"]


def _needs_image_refresh(url: str | None) -> bool:
    if not url:
        return True
    broken = ("unsplash.com", "placehold.co", "picsum.photos")
    return any(b in url for b in broken)


async def patch_menu_images(db) -> int:
    """Ensure every menu item has a reliable image_url."""
    result = await db.execute(
        select(MenuItem, Restaurant.slug).join(Restaurant, MenuItem.restaurant_id == Restaurant.id)
    )
    updated = 0
    for item, slug in result.all():
        brand = RESTAURANT_BRANDING.get(slug, {})
        imgs = {**MENU_IMAGES, **brand.get("menu_images", {})}
        target = imgs.get(item.name) or DEFAULT_FOOD_IMAGE
        if item.image_url != target:
            item.image_url = target
            updated += 1
    if updated:
        await db.flush()
    return updated


async def patch_tenant_branding(db) -> int:
    """Refresh tenant hero/gallery URLs away from broken Unsplash links."""
    result = await db.execute(select(Tenant))
    updated = 0
    for tenant in result.scalars().all():
        brand = RESTAURANT_BRANDING.get(tenant.slug, {})
        if not brand:
            continue
        if _needs_image_refresh(tenant.hero_image) and brand.get("hero_image"):
            tenant.hero_image = brand["hero_image"]
            updated += 1
        if brand.get("gallery"):
            tenant.gallery = brand["gallery"]
            updated += 1
        if brand.get("logo_url") and _needs_image_refresh(tenant.logo_url):
            tenant.logo_url = brand["logo_url"]
            updated += 1
        if brand.get("primary_color"):
            tenant.primary_color = brand["primary_color"]
        if brand.get("secondary_color"):
            tenant.secondary_color = brand["secondary_color"]
    if updated:
        await db.flush()
    return updated
