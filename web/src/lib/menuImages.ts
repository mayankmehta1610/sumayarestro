/** Bundled images served from sumaya-web — always available. */

export const FOOD_FALLBACK = '/images/food-fallback.svg';

const MENU_SLUG: Record<string, string> = {
  'Paneer Tikka': '/images/menu/paneer-tikka.jpg',
  'Dal Makhani': '/images/menu/dal-makhani.jpg',
  'Butter Naan': '/images/menu/butter-naan.jpg',
  Lassi: '/images/menu/lassi.jpg',
  Thali: '/images/menu/thali.jpg',
  Biryani: '/images/menu/biryani.jpg',
  Chaat: '/images/menu/chaat.jpg',
  Kulfi: '/images/menu/kulfi.jpg',
  'Tandoori Chicken': '/images/menu/tandoori-chicken.jpg',
  'Palak Paneer': '/images/menu/palak-paneer.jpg',
  'Gulab Jamun': '/images/menu/gulab-jamun.jpg',
  'Masala Dosa': '/images/menu/masala-dosa.jpg',
};

export const GALLERY_IMAGES = [1, 2, 3, 4, 5, 6].map((n) => `/images/gallery/${n}.jpg`);
export const HERO_IMAGE = '/images/gallery/hero.jpg';

function isBrokenUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  return ['unsplash.com', 'wikimedia.org', 'loremflickr.com'].some((h) => url.includes(h));
}

export function resolveMenuImage(name: string, imageUrl?: string | null): string {
  if (imageUrl?.includes('/images/menu/')) return imageUrl;
  if (imageUrl && !isBrokenUrl(imageUrl)) return imageUrl;
  return MENU_SLUG[name] || FOOD_FALLBACK;
}

export function resolveGalleryImage(url: string, index: number): string {
  if (url?.includes('/images/gallery/')) return url;
  if (url && !isBrokenUrl(url)) return url;
  return GALLERY_IMAGES[index % GALLERY_IMAGES.length] || FOOD_FALLBACK;
}

export function resolveHeroImage(url?: string | null): string {
  if (url?.includes('/images/gallery/')) return url;
  if (url && !isBrokenUrl(url)) return url;
  return HERO_IMAGE;
}
