import { useState } from 'react';
import { imageUrl } from '../lib/propertyFields.js';
import Button from './ui/Button.jsx';
import ErrorMessage from './ui/ErrorMessage.jsx';

const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export default function ImageInput({ value, onChange, uploading, setUploading, error }) {
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const full = value.length >= 10;

  function append(url) {
    const parsed = imageUrl.safeParse(url);
    if (!parsed.success) return setMessage('Enter a valid HTTPS image URL.');
    if (value.includes(parsed.data)) return setMessage('That image is already included.');
    onChange([...value, parsed.data]);
    setMessage('');
    setDraft('');
  }

  async function upload(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('upload_preset', preset);
      const response = await fetch('https://api.cloudinary.com/v1_1/' + encodeURIComponent(cloud) + '/image/upload',
        { method: 'POST', body });
      if (!response.ok) throw new Error('Upload failed');
      append((await response.json()).secure_url);
    } catch {
      setMessage('Image upload failed. Choose the file again or paste its HTTPS URL.');
    } finally {
      setUploading(false);
    }
  }

  return <fieldset className="space-y-3">
    <legend className="section-title">Photos</legend>
    <p className="muted">Add 1–10 photos. The first photo appears on your dashboard.</p>
    {value.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {value.map((url, index) => <li key={index} className="min-w-0">
        <img src={url} alt={'Property photo ' + (index + 1)} className="aspect-[4/3] w-full rounded-lg object-cover" />
        <button type="button" disabled={uploading} className="text-link mt-1 text-sm"
          aria-label={'Remove photo ' + (index + 1)} onClick={() => onChange(value.filter((_, i) => i !== index))}>
          Remove
        </button>
      </li>)}
    </ul>}
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-48 flex-1">HTTPS image URL
        <input className="field-input" type="url" value={draft} disabled={full || uploading}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); append(draft); } }}
          onChange={(event) => setDraft(event.target.value)} placeholder="https://…" />
      </label>
      <Button variant="secondary" disabled={full || uploading || !draft.trim()} onClick={() => append(draft)}>Add URL</Button>
    </div>
    {cloud && preset && <label className="block text-sm font-medium">Upload a photo
      <input type="file" accept="image/*" className="field-input" disabled={full || uploading} onChange={upload} />
    </label>}
    {uploading && <p role="status">Uploading photo…</p>}
    {(message || error) && <ErrorMessage message={message || error} />}
  </fieldset>;
}
