import { PROVINCES } from "@/lib/provinces";
import { Label } from "@/components/ui/label";

export function ProvinceSelect({ id, value, onChange }: {
  id: string;
  value: string;
  onChange: (province: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>İl</Label>
      <select id={id} value={value} required onChange={(event) => onChange(event.target.value)}
        className="block h-12 w-full rounded-md border border-input bg-card px-3 text-base text-foreground">
        <option value="" disabled>İl seç</option>
        {PROVINCES.map((province) => <option key={province}>{province}</option>)}
      </select>
    </div>
  );
}
