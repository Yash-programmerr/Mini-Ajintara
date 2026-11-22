import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© Ajintara. Hotel booking for India.</p>
        <div className="flex gap-4">
          <Link to="/partner" className="hover:text-slate-900">
            Partner
          </Link>
          <Link to="/admin" className="hover:text-slate-900">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
