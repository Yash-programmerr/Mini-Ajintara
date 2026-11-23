import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { adminKeys, getPropertyForReview, reviewProperty } from '../../api/admin.js';
import { partnerKeys } from '../../api/partner.js';
import PropertySummary from '../../components/PropertySummary.jsx';
import RoomList from '../../components/RoomList.jsx';
import ApiError from '../../components/ui/ApiError.jsx';
import Button from '../../components/ui/Button.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { useAuth } from '../../hooks/useAuth.js';

function RejectDialog({ close, submit, busy, error }) {
  const [reason, setReason] = useState('');
  const [invalid, setInvalid] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  function reject(event) {
    event.preventDefault();
    const value = reason.trim();
    if (value.length < 5 || value.length > 300) return setInvalid(true);
    submit({ action: 'reject', reason: value });
  }
  return <dialog ref={dialog} aria-labelledby="reject-title"
    className="m-auto w-[min(28rem,92%)] rounded-xl p-6 shadow-lg backdrop:bg-slate-900/50"
    onCancel={(event) => { event.preventDefault(); if (!busy) close(); }}>
    <form className="space-y-4" onSubmit={reject}>
      <h2 id="reject-title" className="section-title">Reject property</h2>
      <label className="block">Reason for the partner
        <textarea rows={4} className="field-input" value={reason} onChange={(e) => {
          setReason(e.target.value); setInvalid(false);
        }} required maxLength={300} aria-invalid={invalid} aria-describedby="reason-help" />
      </label>
      <p id="reason-help" className={invalid ? 'field-error' : 'muted'}>Enter 5–300 characters explaining what needs to change.</p>
      <ApiError error={error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="danger" disabled={busy}>{busy ? 'Rejecting…' : 'Reject property'}</Button>
        <Button variant="secondary" disabled={busy} onClick={close}>Cancel</Button>
      </div>
    </form>
  </dialog>;
}

export default function Review() {
  const { id } = useParams();
  const { user } = useAuth();
  const [rejecting, setRejecting] = useState(false);
  const client = useQueryClient();
  const keys = adminKeys(user.id);
  const query = useQuery({ queryKey: [...keys, id], queryFn: ({ signal }) => getPropertyForReview(id, signal) });
  const review = useMutation({
    mutationFn: (decision) => reviewProperty(id, decision),
    onSuccess: async (result) => {
      setRejecting(false);
      toast.success('Property ' + result.status);
      await Promise.all([
        client.invalidateQueries({ queryKey: keys }),
        client.invalidateQueries({ queryKey: partnerKeys(query.data.partnerId.id) }),
      ]);
    },
    onError: async (error) => {
      if (error.response?.data?.error?.code === 'NOT_PENDING') {
        setRejecting(false);
        await client.invalidateQueries({ queryKey: keys });
      }
    },
  });
  if (query.isPending) return <Spinner />;
  if (query.isError) return <ApiError error={query.error} />;
  const property = query.data;
  return <div className="space-y-5">
    <Link to="/admin" className="text-link">Pending properties</Link>
    <PropertySummary property={property} />
    <section className="panel space-y-2">
      <h2 className="section-title">Partner</h2>
      <p>{property.partnerId.name} · {property.partnerId.email}</p>
    </section>
    <section className="panel space-y-3">
      <h2 className="section-title">Room types</h2><RoomList rooms={property.roomTypes} />
    </section>
    {!rejecting && <ApiError error={review.error} />}
    {property.status === 'pending' && <div className="flex flex-wrap gap-3">
      <Button disabled={review.isPending} onClick={() => review.mutate({ action: 'approve' })}>
        {review.isPending && !rejecting ? 'Approving…' : 'Approve'}
      </Button>
      <Button variant="danger" disabled={review.isPending} onClick={() => { review.reset(); setRejecting(true); }}>Reject</Button>
    </div>}
    {rejecting && <RejectDialog close={() => { setRejecting(false); review.reset(); }}
      submit={review.mutate} busy={review.isPending} error={review.error} />}
  </div>;
}
