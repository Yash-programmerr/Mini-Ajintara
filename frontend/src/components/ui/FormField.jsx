import { useId } from 'react';

export default function FormField({ label, error, multiline, ...props }) {
  const id = useId();
  const Input = multiline ? 'textarea' : 'input';
  return <div>
    <label className="field-label" htmlFor={id}>{label}</label>
    <Input {...props} id={id} className="field-input" aria-invalid={Boolean(error)}
      aria-describedby={error ? id + '-error' : undefined} />
    {error && <p id={id + '-error'} className="field-error" role="alert">{error.message}</p>}
  </div>;
}
