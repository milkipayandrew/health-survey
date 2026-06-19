'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { BrandSwatches } from '@/components/brand-swatches';
import { addClient, updateClient } from '@/lib/mock/store';
import { primaryButtonClasses, secondaryButtonClasses } from '@/lib/utils';
import type { Client, ClientStatus, NewClientInput } from '@/types/domain';

/** Default brand colors offered before the Admin picks their own. */
const DEFAULT_PRIMARY_COLOR = '#1d4ed8';
const DEFAULT_SECONDARY_COLOR = '#60a5fa';

/** Selectable client statuses, with human labels for the radio group. */
const STATUS_OPTIONS: { value: ClientStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

interface ClientFormProps {
  /**
   * When provided, the form edits this existing client in place (pre-filled from
   * its name + branding + status) instead of creating a blank new client.
   */
  client?: Client;
}

/**
 * Client form, reused for both onboarding and editing. Captures the organization
 * name, logo, brand colors, and status. On submit it either persists a new
 * client (when {@link ClientFormProps.client} is absent) or edits the existing
 * one in place via {@link updateClient} — preserving its `id` and `createdAt` —
 * then navigates back to the list where the change is reflected (and the survey
 * preview picks up updated branding).
 */
export function ClientForm({ client }: ClientFormProps = {}) {
  const router = useRouter();

  const [name, setName] = useState(() => client?.name ?? '');
  const [logo, setLogo] = useState(() => client?.branding.logo ?? '');
  const [primaryColor, setPrimaryColor] = useState(
    () => client?.branding.primaryColor ?? DEFAULT_PRIMARY_COLOR,
  );
  const [secondaryColor, setSecondaryColor] = useState(
    () => client?.branding.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
  );
  const [status, setStatus] = useState<ClientStatus>(
    () => client?.status ?? 'active',
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input: NewClientInput = {
      name: name.trim(),
      branding: { logo: logo.trim(), primaryColor, secondaryColor },
      status,
    };
    if (client === undefined) {
      addClient(input);
    } else {
      updateClient(client.id, input);
    }
    router.push('/clients');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="client-name" className="text-sm font-medium">
          Organization name
        </label>
        <input
          id="client-name"
          name="name"
          type="text"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Lakeside Family Health"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="client-logo" className="text-sm font-medium">
          Logo URL
        </label>
        <input
          id="client-logo"
          name="logo"
          type="url"
          required
          value={logo}
          onChange={(event) => setLogo(event.target.value)}
          placeholder="https://…/logo.png"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
        />
        <p className="text-xs text-zinc-500">
          Branding shown on the survey. Use any image URL for the demo.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Brand colors</legend>
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-primary" className="text-xs text-zinc-500">
              Primary
            </label>
            <input
              id="client-primary"
              name="primaryColor"
              type="color"
              value={primaryColor}
              onChange={(event) => setPrimaryColor(event.target.value)}
              className="h-9 w-16 cursor-pointer rounded-md border border-zinc-300"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="client-secondary" className="text-xs text-zinc-500">
              Secondary
            </label>
            <input
              id="client-secondary"
              name="secondaryColor"
              type="color"
              value={secondaryColor}
              onChange={(event) => setSecondaryColor(event.target.value)}
              className="h-9 w-16 cursor-pointer rounded-md border border-zinc-300"
            />
          </div>
        </div>
        <BrandSwatches
          className="mt-1"
          branding={{ logo, primaryColor, secondaryColor }}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Status</legend>
        <div className="flex gap-4">
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex gap-3">
        <button
          type="submit"
          className={primaryButtonClasses()}
        >
          {client === undefined ? 'Add client' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/clients')}
          className={secondaryButtonClasses()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
