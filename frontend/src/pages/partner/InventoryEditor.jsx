import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { getInventory, inventoryKey, updateInventory } from '../../api/partner.js';
import { inventoryMonth, todayIST, formatStayDate } from '../../lib/date.js';
import { rangeSchema } from '../../lib/propertyFields.js';
import { formatINR, rupeesFromPaise } from '../../lib/money.js';
import { useAuth } from '../../hooks/useAuth.js';
import ApiError from '../../components/ui/ApiError.jsx';
import Button from '../../components/ui/Button.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

function RangeForm({ room, month, today, userId }) {
  const client = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(rangeSchema(today, month.lastNight)),
    defaultValues: { from: month.from, to: month.from, pricePaise: '', totalRooms: '' },
  });
  const save = useMutation({
    mutationFn: (data) => updateInventory(room.id, data),
    onSuccess: () => client.invalidateQueries({ queryKey: inventoryKey(userId, room.id) }),
  });
  return <form className="space-y-3" onSubmit={handleSubmit((data) => save.mutate(data))}>
    <h3 className="font-semibold">Update a date range</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      {['from', 'to'].map((field) => <FormField key={field} type="date" min={today} max={month.lastNight}
        label={field === 'from' ? 'First night' : 'Last night (inclusive)'} error={errors[field]} {...register(field)} />)}
      <FormField label="New nightly price (₹)" inputMode="decimal" placeholder={rupeesFromPaise(room.basePricePaise)}
        error={errors.pricePaise} {...register('pricePaise')} />
      <FormField label="New total rooms" type="number" placeholder={String(room.totalRooms)}
        error={errors.totalRooms} {...register('totalRooms')} />
    </div>
    <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Updating…' : 'Update nights'}</Button>
    <ApiError error={save.error} />
    {save.isSuccess && <p role="status">Updated {save.data.updatedDays} nights.</p>}
  </form>;
}

export default function InventoryEditor({ rooms }) {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState('');
  const [offset, setOffset] = useState(0);
  const today = todayIST();
  const month = inventoryMonth(today, offset);
  const room = rooms.find((r) => r.id === roomId) || rooms[0];
  const query = useQuery({
    queryKey: [...inventoryKey(user.id, room?.id), month.from, month.to],
    queryFn: ({ signal }) => getInventory(room.id, month.from, month.to, signal), enabled: Boolean(room),
  });
  return <section className="panel space-y-5">
    <h2 className="section-title">Nightly inventory</h2>
    {!room ? <p className="muted">Add a room type to manage its inventory.</p> : <>
      <label className="field-label">Room type<select value={room.id} className="field-input" onChange={(e) => setRoomId(e.target.value)}>
        {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="secondary" disabled={!month.hasPrevious} onClick={() => setOffset(offset - 1)}>Previous month</Button>
        <h3 className="font-semibold">{month.label}</h3>
        <Button variant="secondary" disabled={!month.hasNext} onClick={() => setOffset(offset + 1)}>Next month</Button>
      </div>
      {query.isPending && <Spinner />}
      <ApiError error={query.error} />
      {query.data?.length === 0 && <p>No inventory for this month.</p>}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{query.data?.map((night) =>
        <li key={night.date} className="rounded-lg border border-slate-200 p-2 text-sm">
          <time dateTime={night.date}>{formatStayDate(night.date)}</time><strong className="block">{formatINR(night.pricePaise)}</strong>
          <span>{night.booked}/{night.totalRooms} booked</span>
        </li>)}</ul>
      <RangeForm key={room.id + month.from} room={room} month={month} today={today} userId={user.id} />
    </>}
  </section>;
}
