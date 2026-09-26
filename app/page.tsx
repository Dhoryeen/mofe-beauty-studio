export default function Home() {
  return (
    <div className="grid gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Look → approve → book → glow</h1>
      <p className="max-w-2xl text-muted">
        Mofe Beauty Studio lets clients design a makeup and hairstyling look, consult with the
        studio, approve the plan, book and pay, then follow preparation through to completion.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href="/gallery" className="rounded-md bg-ink px-4 py-2 text-sm text-cream">
          Browse gallery
        </a>
        <a href="/design-system" className="rounded-md border border-ink/20 px-4 py-2 text-sm">
          View design system (Phase 1)
        </a>
      </div>
      <p className="text-sm text-muted">
        Inspiration photos guide discussion and do not guarantee an identical result.
      </p>
    </div>
  );
}
