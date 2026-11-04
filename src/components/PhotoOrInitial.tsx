import React, { useEffect, useState } from 'react';

interface PhotoOrInitialProps {
  /** A photo address; `null`/empty or a failed load shows `fallback` instead. */
  src?: string | null;
  alt: string;
  imgClassName: string;
  fallback: React.ReactNode;
}

/** Shows a profile photo, and quietly falls back to the initial when there is none or it does not load. */
export const PhotoOrInitial: React.FC<PhotoOrInitialProps> = ({ src, alt, imgClassName, fallback }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={imgClassName}
    />
  );
};
