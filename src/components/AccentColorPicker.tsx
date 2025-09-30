import { Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

const PRESET_COLORS = [
  { name: 'Teal', value: '174 72% 56%' },
  { name: 'Blue', value: '217 91% 60%' },
  { name: 'Purple', value: '262 83% 58%' },
  { name: 'Pink', value: '330 81% 60%' },
  { name: 'Orange', value: '25 95% 53%' },
  { name: 'Green', value: '142 71% 45%' },
  { name: 'Red', value: '0 72% 51%' },
  { name: 'Yellow', value: '48 96% 53%' },
];

export function AccentColorPicker() {
  const { accentColor, setAccentColor } = useTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Palette className="h-5 w-5" />
          <span className="sr-only">Pick accent color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Accent Color</Label>
          <div className="grid grid-cols-4 gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => setAccentColor(color.value)}
                className={`
                  aspect-square rounded-lg border-2 transition-all hover:scale-110
                  ${accentColor === color.value ? 'border-foreground ring-2 ring-foreground/20' : 'border-transparent'}
                `}
                style={{ backgroundColor: `hsl(${color.value})` }}
                title={color.name}
              />
            ))}
          </div>
          <div className="pt-2">
            <Label htmlFor="custom-color" className="text-xs text-muted-foreground">
              Custom HSL (e.g., "174 72% 56%")
            </Label>
            <input
              id="custom-color"
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm"
              placeholder="H S% L%"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
