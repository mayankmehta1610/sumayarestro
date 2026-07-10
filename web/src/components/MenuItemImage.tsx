import { useState } from 'react';
import { FOOD_FALLBACK, resolveMenuImage } from '../lib/menuImages';

interface Props {
  name: string;
  imageUrl?: string | null;
  className?: string;
  eager?: boolean;
}

export default function MenuItemImage({ name, imageUrl, className = 'h-32 w-full object-cover', eager }: Props) {
  const [src, setSrc] = useState(() => resolveMenuImage(name, imageUrl));

  return (
    <img
      src={src}
      alt={name}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== FOOD_FALLBACK) setSrc(FOOD_FALLBACK);
      }}
    />
  );
}
