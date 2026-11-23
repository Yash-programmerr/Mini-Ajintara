import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminKeys, getPendingProperties } from '../../api/admin.js';
import ApiError from '../../components/ui/ApiError.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 10;
  const query = useQuery({
    queryKey: [...adminKeys(user.id), 'pending', page, limit],
    queryFn: ({ signal }) => getPendingProperties(page, limit, signal),
  });
  const queue = query.data;
  return <div className="space-y-6">
    <h1 className="page-title">Admin dashboard</h1>
    <section className="panel space-y-4">
      <h2 className="section-title">Pending properties</h2>
      {query.isPending && <Spinner />}
      <ApiError error={query.error} />
      {queue && <>
        {queue.items.length ? <ul className="divide-y divide-slate-200">
          {queue.items.map((property) => <li key={property.id}>
            <Link to={'/admin/properties/' + property.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg py-4 hover:bg-slate-50">
              <div className="min-w-0"><h3 className="font-semibold underline underline-offset-4">{property.name}</h3>
                <p className="muted">{property.city}</p></div>
              <div className="min-w-0 break-words text-sm sm:text-right">{property.partnerId.name}
                <p className="muted">{property.partnerId.email}</p></div>
            </Link>
          </li>)}
        </ul> : <EmptyState title="No pending properties on this page" />}
        {(queue.totalPages > 1 || page > 1) && <nav aria-label="Review queue pages"
          className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous page</Button>
          <span className="muted">Page {page}{queue.totalPages >= page && ' of ' + queue.totalPages}</span>
          <Button variant="secondary" disabled={page >= queue.totalPages} onClick={() => setPage(page + 1)}>Next page</Button>
        </nav>}
      </>}
    </section>
    <section className="grid gap-3 sm:grid-cols-3" aria-label="Planned admin features">
      {['Bookings', 'Users', 'Stats'].map((label) => <div key={label} className="panel">
        <h2 className="section-title">{label}</h2><p className="muted">Planned for A6</p>
      </div>)}
    </section>
  </div>;
}
