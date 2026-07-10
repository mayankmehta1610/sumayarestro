/** Reliable menu & branding images — Wikimedia + local fallback (Unsplash often blocks hotlinking). */

export const FOOD_FALLBACK = '/images/food-fallback.svg';

/** Stable food photos by dish name (Wikimedia Commons). */
export const MENU_IMAGE_BY_NAME: Record<string, string> = {
  'Paneer Tikka': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Paneer_Tikka.jpg/400px-Paneer_Tikka.jpg',
  'Dal Makhani': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Dal_Makhani.jpg/400px-Dal_Makhani.jpg',
  'Butter Naan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Naan_bread.jpg/400px-Naan_bread.jpg',
  Lassi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Mango_lassi.jpg/400px-Mango_lassi.jpg',
  Thali: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Indian_thali.jpg/400px-Indian_thali.jpg',
  Biryani: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Biryani_in_Kolkata.jpg/400px-Biryani_in_Kolkata.jpg',
  Chaat: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Chaat_mumbai.jpg/400px-Chaat_mumbai.jpg',
  Kulfi: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Kulfi.jpg/400px-Kulfi.jpg',
  'Tandoori Chicken': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Tandoori_chicken.jpg/400px-Tandoori_chicken.jpg',
  'Palak Paneer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Palak_Paneer.jpg/400px-Palak_Paneer.jpg',
  'Gulab Jamun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Gulab_jamun.jpg/400px-Gulab_jamun.jpg',
  'Masala Dosa': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Masala_dosa.jpg/400px-Masala_dosa.jpg',
  'Fish Amritsari': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Fried_fish_and_chips.jpg/400px-Fried_fish_and_chips.jpg',
  'Mutton Rogan Josh': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Rogan_josh.jpg/400px-Rogan_josh.jpg',
  Rasmalai: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Ras_Malai.jpg/400px-Ras_Malai.jpg',
  Papad: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Papadum.jpg/400px-Papadum.jpg',
  Coffee: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/A_small_cup_of_coffee.JPG/400px-A_small_cup_of_coffee.JPG',
  Pasta: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Pasta_%28generic%29.jpg/400px-Pasta_%28generic%29.jpg',
  Sandwich: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Sandwich.jpg/400px-Sandwich.jpg',
  Brownie: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Brownie_%28confectionery%29.jpg/400px-Brownie_%28confectionery%29.jpg',
  'Fish Curry': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Fish_curry.jpg/400px-Fish_curry.jpg',
  Appam: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Appam_%28food%29.jpg/400px-Appam_%28food%29.jpg',
  'Prawns Fry': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Fried_prawns.jpg/400px-Fried_prawns.jpg',
};

export const RESTAURANT_HERO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Good_Food_Display_-_NCI_Visuals_Online.jpg/1280px-Good_Food_Display_-_NCI_Visuals_Online.jpg';

export function resolveMenuImage(name: string, imageUrl?: string | null): string {
  if (imageUrl && !imageUrl.includes('unsplash.com')) return imageUrl;
  return MENU_IMAGE_BY_NAME[name] || imageUrl || FOOD_FALLBACK;
}
