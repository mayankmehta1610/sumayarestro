/** Same reliable URLs as web — Wikimedia Commons. */
export const FOOD_FALLBACK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Indian_thali.jpg/400px-Indian_thali.jpg';

export const MENU_IMAGE_BY_NAME: Record<string, string> = {
  'Paneer Tikka': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Paneer_Tikka.jpg/400px-Paneer_Tikka.jpg',
  'Dal Makhani': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Dal_Makhani.jpg/400px-Dal_Makhani.jpg',
  'Butter Naan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Naan_bread.jpg/400px-Naan_bread.jpg',
  Biryani: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Biryani_in_Kolkata.jpg/400px-Biryani_in_Kolkata.jpg',
  'Tandoori Chicken': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Tandoori_chicken.jpg/400px-Tandoori_chicken.jpg',
  'Masala Dosa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Masala_dosa.jpg/400px-Masala_dosa.jpg',
};

export function resolveMenuImage(name: string, imageUrl?: string | null): string {
  if (imageUrl && !imageUrl.includes('unsplash.com')) return imageUrl;
  return MENU_IMAGE_BY_NAME[name] || imageUrl || FOOD_FALLBACK;
}
