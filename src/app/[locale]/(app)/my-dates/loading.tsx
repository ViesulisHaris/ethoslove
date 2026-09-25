/** My dates on its way: the page's own shape (the heading, then the cards), so nothing jumps when it arrives. */
export default function MyDatesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6" aria-busy="true">
      <div className="h-10 w-44 animate-pulse rounded-xl bg-muted" />
      <div className="mt-3 h-5 w-72 max-w-full animate-pulse rounded-lg bg-muted" />
      <ul aria-hidden="true" className="mt-10 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i}>
            <div className="aspect-[4/3] animate-pulse rounded-[24px] bg-muted" />
            <div className="mt-3.5 h-5 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 w-1/2 animate-pulse rounded-md bg-muted" />
          </li>
        ))}
      </ul>
    </div>
  );
}
