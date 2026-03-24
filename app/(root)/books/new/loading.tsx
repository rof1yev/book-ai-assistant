export default function LoadingPage() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="min-h-svh flex items-center justify-center"
    >
      Loading...
    </div>
  );
}
