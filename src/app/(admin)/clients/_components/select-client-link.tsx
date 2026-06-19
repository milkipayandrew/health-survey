'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useActiveClient } from '@/hooks/active-client';

interface SelectClientLinkProps {
  /** The client to switch into when this link is followed. */
  clientId: string;
  /** Card body rendered inside the link. */
  children: ReactNode;
  /** Optional class names for the link wrapper. */
  className?: string;
}

/**
 * Card-body link that switches the shared active-client context to this client
 * and navigates to its surveys. Setting the context directly keeps the active
 * client as the single source of truth; the `?client=` query param is carried
 * along only as a back-compat hint for direct/bookmarked links.
 */
export function SelectClientLink({
  clientId,
  children,
  className,
}: SelectClientLinkProps) {
  const { setActiveClientId } = useActiveClient();
  return (
    <Link
      href={`/surveys?client=${clientId}`}
      onClick={() => setActiveClientId(clientId)}
      className={className}
    >
      {children}
    </Link>
  );
}
