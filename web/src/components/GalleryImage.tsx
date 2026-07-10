import { useState } from 'react';
import { FOOD_FALLBACK, resolveGalleryImage } from '../lib/menuImages';

interface Props {
  src: string;
  index: number;
  className?: string;
}

export default function GalleryImage({ src, index, className = 'h-48 w-full rounded-2xl object-cover shadow-md' }: Props) {
  const [imgSrc, setImgSrc] = useState(() => resolveGalleryImage(src, index));

  return (
    <img
      data-testid="gallery-image"
      src={imgSrc}
      alt=""
      className={className}
      loading="eager"
      onError={() => {
        const fallback = resolveGalleryImage('', index);
        if (imgSrc !== fallback) setImgSrc(fallback);
        else if (imgSrc !== FOOD_FALLBACK) setImgSrc(FOOD_FALLBACK);
      }}
    />
  );
}
