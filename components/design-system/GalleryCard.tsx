export function GalleryCard({
  title,
  meta,
  priceLabel
}: {
  title: string;
  meta: string;
  priceLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg bg-card shadow-card">
      <div className="flex h-36 items-center justify-center bg-blush text-sm text-muted">
        Photo placeholder
      </div>
      <div className="grid gap-1 p-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted">{meta}</p>
        <p className="text-xs font-medium">{priceLabel}</p>
      </div>
    </div>
  );
}
