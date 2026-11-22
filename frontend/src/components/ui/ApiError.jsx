import ErrorMessage from './ErrorMessage.jsx';

export default function ApiError({ error }) {
  if (!error) return null;
  const info = error.response?.data?.error;
  const details = (info?.details ?? []).map((item) =>
    typeof item === 'string' ? item : item?.date || item?.message).filter(Boolean);
  return <ErrorMessage message={[info?.message || 'Unable to reach the server. Please try again.', ...details].join(' ')} />;
}
