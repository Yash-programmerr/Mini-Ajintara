import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { partnerKeys, getProperties } from '../../api/partner.js';
import { useAuth } from '../../hooks/useAuth.js';
import PropertyStatus from '../../components/PropertyStatus.jsx';
import ApiError from '../../components/ui/ApiError.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const query = useQuery({ queryKey: [...partnerKeys(user.id), 'properties'], queryFn: ({ signal }) => getProperties(signal) });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="page-title">My properties</h1>
      <Link className="action-link" to="/partner/properties/new">Add property</Link>
    </div>
    {query.isPending && <Spinner />}
    <ApiError error={query.error} />
    {query.data?.length === 0 && <EmptyState title="No properties yet" description="Add your first property to submit it for review." />}
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{query.data?.map((p) =>
      <li key={p.id} className="panel">
        <img className="mb-4 aspect-video w-full rounded-lg object-cover" src={p.images[0]} alt={p.name} />
        <PropertyStatus status={p.status} />
        <h2 className="section-title mt-2"><Link to={'/partner/properties/' + p.id} className="text-link">{p.name}</Link></h2>
        <p className="muted">{p.city} · {p.roomTypes.length} room types</p>
        {p.rejectReason && <p className="mt-2 text-red-800">{p.rejectReason}</p>}
      </li>)}</ul>
  </div>;
}
