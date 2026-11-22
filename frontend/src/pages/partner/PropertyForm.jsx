import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProperty, partnerKeys, propertyKey, saveProperty } from '../../api/partner.js';
import AmenityInput from '../../components/AmenityInput.jsx';
import ImageInput from '../../components/ImageInput.jsx';
import ApiError from '../../components/ui/ApiError.jsx';
import Button from '../../components/ui/Button.jsx';
import FormField from '../../components/ui/FormField.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { propertySchema } from '../../lib/propertyFields.js';

function Form({ property, userId }) {
  const [uploading, setUploading] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  const id = property?.id;
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: property?.name ?? '', city: property?.city ?? '', address: property?.address ?? '',
      description: property?.description ?? '', amenities: property?.amenities ?? [], images: property?.images ?? [],
    },
  });
  const mutation = useMutation({
    mutationFn: (fields) => saveProperty(id, fields),
    onSuccess: async (saved) => {
      await client.invalidateQueries({ queryKey: partnerKeys(userId) });
      navigate('/partner/properties/' + saved.id);
    },
  });
  return <form className="panel mx-auto max-w-3xl space-y-6" noValidate
    onSubmit={handleSubmit((fields) => mutation.mutate(fields))}>
    <div><Link to={id ? '/partner/properties/' + id : '/partner'} className="text-link">Back</Link>
      <h1 className="page-title mt-3">{id ? 'Edit property' : 'Add property'}</h1>
    </div>
    <FormField label="Property name" error={errors.name} {...register('name')} />
    <FormField label="City" error={errors.city} {...register('city')} />
    <FormField label="Street address" error={errors.address} {...register('address')} />
    <FormField label="Description" multiline rows={4} error={errors.description} {...register('description')} />
    <Controller name="amenities" control={control} render={({ field }) =>
      <AmenityInput value={field.value} onChange={field.onChange} />} />
    <Controller name="images" control={control} render={({ field }) =>
      <ImageInput value={field.value} onChange={field.onChange} error={errors.images?.message}
        uploading={uploading} setUploading={setUploading} />} />
    {property?.status === 'rejected' && <p className="muted">Saving your changes sends this property back for review.</p>}
    <ApiError error={mutation.error} />
    <Button type="submit" disabled={uploading || mutation.isPending}>
      {mutation.isPending ? 'Saving…' : id ? 'Save changes' : 'Create property'}
    </Button>
  </form>;
}

export default function PropertyForm() {
  const { id } = useParams();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: propertyKey(user.id, id), queryFn: () => getProperty(id), enabled: Boolean(id),
  });
  if (id && query.isPending) return <Spinner />;
  if (id && query.isError) return <ApiError error={query.error} />;
  return <Form key={id || 'new'} property={id && query.data} userId={user.id} />;
}
