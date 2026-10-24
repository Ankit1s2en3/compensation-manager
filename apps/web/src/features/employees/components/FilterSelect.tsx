import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Radix Select reserves the empty string, so "no filter" needs its own value. */
const ALL = '__all__';

/** A labelled select with an "All" option; reports "All" as null. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: [string, string][];
}) {
  return (
    <div className="w-40 space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map(([id, name]) => (
            <SelectItem key={id} value={id}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
