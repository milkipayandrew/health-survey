'use client';

import Link from 'next/link';

import { useMockData } from '@/hooks/use-mock-data';
import { primaryButtonClasses } from '@/lib/utils';

/** A single summary metric shown on the dashboard. */
interface StatCard {
  label: string;
  value: number;
}

/**
 * Admin dashboard. Summarises the seeded mock data — client counts and survey
 * lifecycle distribution — as the landing surface of the admin shell.
 */
export default function DashboardPage() {
  const data = useMockData();

  if (data === null) {
    return <p className="text-sm text-zinc-500">Loading dashboard…</p>;
  }

  const activeClients = data.clients.filter(
    (client) => client.status === 'active',
  ).length;

  const stats: StatCard[] = [
    { label: 'Clients', value: data.clients.length },
    { label: 'Active clients', value: activeClients },
    { label: 'Surveys', value: data.surveys.length },
    {
      label: 'Published surveys',
      value: data.surveys.filter((survey) => survey.status === 'published')
        .length,
    },
    {
      label: 'Draft surveys',
      value: data.surveys.filter((survey) => survey.status === 'draft').length,
    },
    {
      label: 'Archived surveys',
      value: data.surveys.filter((survey) => survey.status === 'archived')
        .length,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Overview of clients and surveys across the platform.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <dt className="text-sm text-zinc-500">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <Link
        href="/clients"
        className={primaryButtonClasses('inline-flex w-fit items-center')}
      >
        View clients
      </Link>
    </div>
  );
}
