'use client';

/**
 * Reusable controlled text-search input for the admin list views (clients,
 * surveys). It is a small client leaf — it owns no list state itself; the parent
 * holds the query and computes the filtered list in render, so this component
 * stays a single canonical search control reused across lists.
 */

interface SearchInputProps {
  /** The current query string (controlled by the parent). */
  value: string;
  /** Called with the new query on every keystroke. */
  onChange: (value: string) => void;
  /** Accessible label for the input. */
  label: string;
  /** Placeholder text shown when the input is empty. */
  placeholder: string;
  /** Unique id wiring the label to the input. */
  id: string;
}

/**
 * A labelled, controlled search box. Live filtering is the parent's job: this
 * just reports each keystroke up via {@link SearchInputProps.onChange}.
 */
export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  id,
}: SearchInputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
      />
    </div>
  );
}
