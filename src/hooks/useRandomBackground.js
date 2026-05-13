import { useState, useEffect } from 'react';

const backgroundImages = [
  '/images/276423.jpg',
  '/images/31409.jpg',
  '/images/39632.jpg',
  '/images/527886.jpg',
  '/images/527891.jpg',
];

export function useRandomBackground() {
  const [background, setBackground] = useState('');

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
    setBackground(backgroundImages[randomIndex]);
  }, []);

  return background;
}

export default useRandomBackground;
