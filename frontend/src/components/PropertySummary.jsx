import PropertyStatus from './PropertyStatus.jsx';

export default function PropertySummary({ property }) {
  const { name, status, address, city, description, amenities, images, rejectReason } = property;
  return <section className="panel space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="page-title">{name}</h1><p className="muted">{address} · {city}</p></div>
      <PropertyStatus status={status} />
    </div>
    {status === 'rejected' && <p className="rounded-lg bg-red-50 p-3 text-red-800">Reason for rejection: {rejectReason}</p>}
    <div className="flex gap-3 overflow-x-auto pb-1" aria-label="Property photos">
      {images.map((url, index) => <img key={index} src={url} loading="lazy" alt={name + ', photo ' + (index + 1)}
        className="aspect-[4/3] w-64 max-w-[80%] shrink-0 rounded-lg bg-slate-100 object-cover" />)}
    </div>
    <p className="whitespace-pre-line">{description}</p>
    {amenities.length > 0 && <ul className="flex flex-wrap gap-2" aria-label="Amenities">
      {amenities.map((item) => <li key={item} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{item}</li>)}
    </ul>}
  </section>;
}
