import black from "@/assets/rosellea-black.png";
import white from "@/assets/rosellea-white.png";
import { useTheme } from "@/hooks/use-theme";

type Variant = "auto" | "black" | "white";

/**
 * Rosellea wordmark. The source PNGs are cropped to their visible bounds
 * (no transparent padding), so the rendered height is the true visible height.
 * Auto-picks black on light theme and white on dark theme.
 * Pass `variant="black"` or `variant="white"` to force a specific version.
 */
export function Wordmark({
  className = "h-6",
  variant = "auto",
}: {
  className?: string;
  variant?: Variant;
}) {
  const { theme } = useTheme();
  const useWhite = variant === "white" || (variant === "auto" && theme === "dark");
  const src = useWhite ? white : black;
  return (
    <img
      src={src}
      alt="Rosellea"
      className={className + " w-auto object-contain select-none"}
      draggable={false}
    />
  );
}

/**
 * Rosellea mark. Clips the left of the wordmark into a square container.
 * Auto-picks the correct color for the current theme.
 */
export function Mark({
  className = "h-10 w-10",
  variant = "auto",
}: {
  className?: string;
  variant?: Variant;
}) {
  const { theme } = useTheme();
  const useWhite = variant === "white" || (variant === "auto" && theme === "dark");
  const src = useWhite ? white : black;
  return (
    <span
      className={"inline-flex items-center overflow-hidden " + className}
      aria-label="Rosellea"
    >
      <img
        src={src}
        alt=""
        aria-hidden
        className="h-full w-auto max-w-none object-contain object-left select-none"
        draggable={false}
      />
    </span>
  );
}
