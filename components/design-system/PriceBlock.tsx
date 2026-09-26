export function PriceBlock({
  name,
  duration,
  price,
  starting = false,
  extras = []
}: {
  name: string;
  duration: string;
  price: string;
  starting?: boolean;
  extras?: string[];
}) {
  return (
    <div className="rounded-lg bg-card p-4 shadow-card">
      <p className="font-semibold">{name}</p>
      <p className="text-sm text-muted">{duration}</p>
      <p className="mt-2 text-sm font-medium">
        {price} {starting ? <span className="text-muted">· starting price, final quote confirms total</span> : null}
      </p>
      {extras.length ? (
        <ul className="mt-2 list-disc pl-5 text-sm">
          {extras.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
