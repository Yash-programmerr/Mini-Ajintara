import { Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import ApiError from '../ui/ApiError.jsx';
import Button from '../ui/Button.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';

export default function Layout() {
  const { restoreError, retryRestore } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {restoreError && <div className="mb-4 space-y-2"><ApiError error={restoreError} />
          <Button variant="secondary" onClick={retryRestore}>Retry loading your account</Button>
        </div>}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
