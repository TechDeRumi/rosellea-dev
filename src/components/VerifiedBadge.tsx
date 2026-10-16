export function VerifiedBadge({
  verified,
  className = "h-4 w-4",
}: {
  verified?: boolean | null;
  className?: string;
}) {
  if (!verified) return null;
  return (
    <svg
      aria-label="Verified"
      viewBox="0 0 24 24"
      className={`inline-block shrink-0 ${className}`}
      style={{ animation: "verified-fade-in .25s ease-out both" }}
    >
      <circle cx="12" cy="12" r="11" fill="#1D9BF0" />
      <path
        d="M7.75 12.5l2.5 2.5 6-6"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}