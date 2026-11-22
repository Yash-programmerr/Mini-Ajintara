import { useState } from 'react';
import Button from './ui/Button.jsx';

const choices = ['Wi-Fi', 'Parking', 'Breakfast', 'Air conditioning', 'Swimming pool', 'Restaurant'];

export default function AmenityInput({ value, onChange }) {
  const [draft, setDraft] = useState('');
  const full = value.length >= 30;
  function add() {
    const name = draft.trim();
    if (name && !full && !value.includes(name)) onChange([...value, name]);
    setDraft('');
  }
  return <fieldset className="space-y-3">
    <legend className="section-title">Amenities</legend>
    <div className="flex flex-wrap gap-2">
      {[...new Set([...choices, ...value])].map((item) => {
        const selected = value.includes(item);
        return <button key={item} type="button" aria-pressed={selected} disabled={!selected && full}
          onClick={() => onChange(selected ? value.filter((entry) => entry !== item) : [...value, item])}
          className={'rounded-full border px-3 py-1.5 text-sm ' + (selected ? 'bg-slate-800 text-white' : 'border-slate-300')}>
          {item}
        </button>;
      })}
    </div>
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-48 flex-1">Other amenity
        <input className="field-input" value={draft} maxLength={40} disabled={full} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
      </label>
      <Button variant="secondary" disabled={full || !draft.trim()} onClick={add}>Add amenity</Button>
    </div>
  </fieldset>;
}
