import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProperty, propertyKey } from '../../api/partner.js';
import PropertySummary from '../../components/PropertySummary.jsx';
import RoomList from '../../components/RoomList.jsx';
import ApiError from '../../components/ui/ApiError.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import InventoryEditor from './InventoryEditor.jsx';
import RoomForm from './RoomForm.jsx';

export default function Manage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [editing, setEditing] = useState(null);
  const query = useQuery({ queryKey: propertyKey(user.id, id), queryFn: () => getProperty(id) });
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ApiError error={query.error} />;
  const property = query.data;
  return <div className="space-y-5">
    <nav className="flex items-center justify-between"><Link className="text-link" to="/partner">My properties</Link>
      <Link className="action-link" to={'/partner/properties/' + id + '/edit'}>Edit property</Link></nav>
    <PropertySummary property={property} />
    <section className="panel space-y-4"><h2 className="section-title">Room types</h2>
      <RoomList rooms={property.roomTypes} action={(room) => <Button variant="secondary" onClick={() => setEditing(room.id)}>Edit</Button>} />
      <RoomForm key={editing || id} propertyId={id} room={property.roomTypes.find((r) => r.id === editing)}
        onDone={() => setEditing(null)} />
    </section>
    <InventoryEditor rooms={property.roomTypes} />
  </div>;
}
