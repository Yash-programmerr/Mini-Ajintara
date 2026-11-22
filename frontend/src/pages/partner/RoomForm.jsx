import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { addRoomType, editRoomType, partnerKeys } from '../../api/partner.js';
import ApiError from '../../components/ui/ApiError.jsx';
import Button from '../../components/ui/Button.jsx';
import FormField from '../../components/ui/FormField.jsx';
import { roomCreateSchema, roomDetailsSchema } from '../../lib/propertyFields.js';
import { useAuth } from '../../hooks/useAuth.js';

export default function RoomForm({ propertyId, room, onDone }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(room ? roomDetailsSchema : roomCreateSchema),
    defaultValues: room ? { name: room.name, maxGuests: room.maxGuests } : { name: '', basePricePaise: '', totalRooms: '', maxGuests: '' },
  });
  const save = useMutation({
    mutationFn: (data) => room ? editRoomType(room.id, data) : addRoomType(propertyId, data),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: partnerKeys(user.id) });
      reset();
      onDone?.();
    },
  });
  return <form className="space-y-3" onSubmit={handleSubmit((data) => save.mutate(data))}>
    <h3 className="section-title">{room ? 'Edit room type' : 'Add room type'}</h3>
    <FormField label="Room type name" error={errors.name} {...register('name')} />
    <FormField label="Maximum guests per room" type="number" error={errors.maxGuests} {...register('maxGuests')} />
    {!room && <>
      <FormField label="Base price per room per night (₹)" inputMode="decimal" error={errors.basePricePaise} {...register('basePricePaise')} />
      <FormField label="Total rooms" type="number" error={errors.totalRooms} {...register('totalRooms')} />
    </>}
    <ApiError error={save.error} />
    <Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : room ? 'Save room type' : 'Add room type'}</Button>
    {room && <Button variant="ghost" onClick={onDone}>Cancel</Button>}
  </form>;
}
