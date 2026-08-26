'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();

  const adminSections = [
    {
      title: 'WORK',
      links: [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/bookings', label: 'Bookings' },
        { href: '/admin/calendar', label: 'Calendar' },
      ]
    },
    {
      title: 'CUSTOMERS',
      links: [
        { href: '/admin/customers', label: 'Customers' },
      ]
    },
    {
      title: 'BUSINESS',
      links: [
        { href: '/admin/employees', label: 'Employees' },
        { href: '/admin/expenses', label: 'Expenses' },
        { href: '/admin/reports', label: 'Reports' },
      ]
    },
    {
      title: 'SYSTEM',
      links: [
        { href: '/admin/settings', label: 'Settings' },
      ]
    },
  ];

  const employeeSections = [
    {
      title: 'SCHEDULE',
      links: [
        { href: '/employee', label: 'My Jobs' },
        { href: '/employee/availability', label: 'Availability' },
        { href: '/employee/time-off', label: 'Time Off' },
      ]
    },
  ];

  const isAdmin = pathname.startsWith('/admin');
  const sections = isAdmin ? adminSections : employeeSections;

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 overflow-y-auto flex flex-col" style={{ backgroundColor: '#1a3a52' }}>
      {/* Logo Section */}
      <div className="p-6 border-b" style={{ borderColor: '#0f2437' }}>
        <div className="font-bold text-lg text-white tracking-wide" style={{ letterSpacing: '0.15em' }}>
          STEAM
        </div>
        <div className="text-xs mt-1" style={{ color: '#B78E58' }}>Auto Spa</div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-xs font-semibold mb-3 px-2 uppercase tracking-wider" style={{ color: '#6B7280' }}>
              {section.title}
            </p>
            <div className="space-y-1">
              {section.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block px-3 py-2.5 rounded transition-all text-sm"
                  style={{
                    color: pathname === link.href ? '#B78E58' : '#E5E7EB',
                    backgroundColor: pathname === link.href ? 'rgba(184, 142, 88, 0.1)' : 'transparent',
                    borderLeft: pathname === link.href ? '2px solid #B78E58' : '2px solid transparent',
                    paddingLeft: '12px'
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t" style={{ borderColor: '#0f2437' }}>
        <div className="mb-4 px-2">
          <p className="text-xs text-white font-medium">Haaris Adeel</p>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Owner</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Online</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="w-full px-3 py-2 rounded text-xs font-medium transition"
          style={{ backgroundColor: '#B94A48', color: '#FFFFFF' }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
