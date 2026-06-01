/// <reference types="vite/client" />

/**
 * CSS Modules tip tanımı.
 */
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}

/**
 * Resim importları (Leaflet ikonları vb.).
 */
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.svg' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}
