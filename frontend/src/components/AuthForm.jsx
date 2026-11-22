import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../hooks/useAuth.jsx';
import Button from './ui/Button.jsx';
import ErrorMessage from './ui/ErrorMessage.jsx';
import Spinner from './ui/Spinner.jsx';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').toLowerCase(),
  password: z.string().min(1, 'Enter your password.'),
});
const signupSchema = loginSchema.extend({
  name: z.string().trim().min(2, 'Enter at least 2 characters.').max(60),
  password: z.string().min(8, 'Use at least 8 characters.').max(72),
  role: z.enum(['guest', 'partner']),
});
const inputClass = 'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2';

export default function AuthForm({ creating = false }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(creating ? signupSchema : loginSchema),
    defaultValues: creating ? { role: 'guest' } : {},
  });

  async function submit(fields) {
    try {
      const user = await (creating ? signup(fields) : login(fields));
      const home = { guest: '/', partner: '/partner', admin: '/admin' }[user.role];
      navigate(state?.from || home, { replace: true });
    } catch (error) {
      setError('root', { message: error.response?.data?.error?.message || 'Unable to connect. Please try again.' });
    }
  }

  function field(key, label, type, autoComplete) {
    return <div>
      <label htmlFor={key}>{label}</label>
      <input id={key} type={type} autoComplete={autoComplete} className={inputClass}
        aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? key + '-error' : undefined}
        {...register(key)} />
      {errors[key] && <p id={key + '-error'} role="alert" className="text-sm text-red-700">{errors[key].message}</p>}
    </div>;
  }

  return <section className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6">
    <h1 className="mb-6 text-2xl font-semibold">{creating ? 'Create an account' : 'Login'}</h1>
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
      {creating && field('name', 'Name', 'text', 'name')}
      {field('email', 'Email', 'email', 'email')}
      {field('password', 'Password', 'password', creating ? 'new-password' : 'current-password')}
      {creating && <label className="block">Account type
        <select {...register('role')} className={inputClass}>
          <option value="guest">Guest</option>
          <option value="partner">Hotel partner</option>
        </select>
      </label>}
      {errors.root && <ErrorMessage message={errors.root.message} />}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Spinner />}{creating ? 'Sign up' : 'Login'}
      </Button>
    </form>
    <Link className="mt-4 inline-block text-sm underline" state={state} to={creating ? '/login' : '/signup'}>
      {creating ? 'Already registered? Login' : 'Create an account'}
    </Link>
  </section>;
}
