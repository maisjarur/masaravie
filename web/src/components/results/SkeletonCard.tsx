export function SkeletonCard() {
  return (
    <li className="card-skeleton" aria-hidden="true">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--sub" />
      <div className="skeleton-line skeleton-line--text" />
    </li>
  );
}
