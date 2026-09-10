import Loader from './Loader';
export default function Skeleton({ rows = 3 }: { rows?: number }) {
  return <div className="skeleton-list" aria-busy="true">
    <span className="sr-only"><Loader /></span>
    {Array.from({ length: rows }, (_, index) => <div key={index} className="card skeleton-card" aria-hidden="true"><i /><i /><i /></div>)}
  </div>;
}
