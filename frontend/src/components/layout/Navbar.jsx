import { Building2, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';

const roleLinks = {
  guest: { to: '/bookings', label: 'My Bookings' },
  partner: { to: '/partner', label: 'Partner dashboard' },
  admin: { to: '/admin', label: 'Admin dashboard' },
};
const navLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:text-slate-900'
  }`;

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = () => setIsOpen(false);

  const { user, loading, logout } = useAuth();
  const links = [{ to: '/', label: 'Home', end: true }];
  if (user) links.push(roleLinks[user.role]);
  else if (!loading) links.push({ to: '/login', label: 'Login' }, { to: '/signup', label: 'Signup' });

  const menu = <>
    {links.map(({ to, label, end }) => (
      <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={closeMenu}>
        {label}
      </NavLink>
    ))}
    {user && <>
      <span className="px-3 text-sm font-medium">{user.name}</span>
      <button type="button" onClick={() => { closeMenu(); logout(); }} className="rounded-lg px-3 py-2 text-sm">
        Logout
      </button>
    </>}
  </>;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900"
        >
          <Building2 className="h-5 w-5 text-amber-600" aria-hidden="true" />
          Ajintara
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {menu}
        </nav>

        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden"
        >
          <div className="flex flex-col gap-1">
            {menu}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
