import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="font-display text-6xl font-bold text-primary">404</p>
      <h1 className="font-display text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-content-secondary">
        That player or page doesn&apos;t exist on the soka market.
      </p>
      <Link
        href="/dashboard"
        className="btn-base h-10 bg-primary px-5 text-sm text-white hover:bg-primary/90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
