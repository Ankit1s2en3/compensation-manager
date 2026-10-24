import { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';

/**
 * Local, debounced echo of the `q` URL param. Typing updates this input on
 * every keystroke; the URL (and thus the query to the server) only updates
 * 300ms after the user stops, so paging through 10,000 rows doesn't mean a
 * request per keystroke. The table's actual data always comes from the URL,
 * not from this component's state.
 */
export function SearchInput({
  initialValue,
  onChange,
}: {
  initialValue: string | null;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    const handle = setTimeout(() => onChange(value), 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="w-56 space-y-1.5">
      <label className="text-sm font-medium" htmlFor="q">
        Search
      </label>
      <Input
        id="q"
        placeholder="Name…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
