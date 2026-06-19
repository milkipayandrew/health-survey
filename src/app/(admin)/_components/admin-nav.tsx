'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

/** A single destination in the admin navigation. */
interface NavItem {
  href: string;
  label: string;
}

/** Top-level admin surfaces reachable from the shell navigation. */
const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/surveys', label: 'Surveys' },
  { href: '/library', label: 'Library' },
];

/**
 * Admin shell navigation. Highlights the active surface based on the current
 * route. Renders inline so it can adapt to a sidebar (desktop) or a horizontal
 * bar (mobile) via its parent's layout.
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="flex gap-1 md:flex-col">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
