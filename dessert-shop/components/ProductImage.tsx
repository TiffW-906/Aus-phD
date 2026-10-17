import type { Product } from '@/lib/types';

/** Product photo, or a brand-coloured placeholder with the name until a photo is uploaded. */
export function ProductImage({ product, className = '', small = false }: { product: Pick<Product, 'name' | 'image_url'>; className?: string; small?: boolean }) {
  if (product.image_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={product.image_url} alt={product.name} loading="lazy" className={`aspect-square w-full object-cover ${className}`} />;
  }
  return (
    <div
      aria-hidden
      className={`grid aspect-square w-full place-items-center bg-gradient-to-br from-blush to-blush-light p-2 text-center font-bold text-brick/70 ${className}`}
    >
      <span className={small ? 'text-xs leading-tight' : 'text-lg leading-snug'}>{product.name}</span>
    </div>
  );
}
