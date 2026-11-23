import { apiErrorMessage } from '../../api/client.js';
import ErrorMessage from './ErrorMessage.jsx';

export default function ApiError({ error }) {
  if (!error) return null;
  return <ErrorMessage message={apiErrorMessage(error)} />;
}
