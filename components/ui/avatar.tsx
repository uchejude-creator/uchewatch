export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <span className={`avatar ${small ? "avatar-small" : ""}`} aria-label={name}>
      {initials}
    </span>
  );
}
