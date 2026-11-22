import { formatINR } from '../lib/money.js';
import EmptyState from './ui/EmptyState.jsx';

export default function RoomList({ rooms, action }) {
  if (!rooms.length) return <EmptyState title="No room types yet" />;
  return <ul className="divide-y divide-slate-200">
    {rooms.map((room) => <li className="flex flex-wrap items-center justify-between gap-4 py-3" key={room.id}>
      <div><h3 className="font-semibold">{room.name}</h3>
        <p className="muted">{formatINR(room.basePricePaise)} per room per night · {room.totalRooms} rooms · up to {room.maxGuests} guests</p>
      </div>
      {action?.(room)}
    </li>)}
  </ul>;
}
