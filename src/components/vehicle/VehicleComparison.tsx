import React, { useState, useEffect } from 'react';
import { X, Plus, ArrowLeft, Car, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import AppLayout from '@/components/layouts/AppLayout';
import { fetchVehicles } from '@/lib/api';
import { formatCurrency, formatMileage, cn } from '@/lib/utils';
import type { Vehicle } from '@/types/types';
import { useNavigate } from 'react-router-dom';

const MAX = 5;

const ROWS: { label: string; key: keyof Vehicle; fmt?: (v: unknown) => string }[] = [
  { label: 'Make', key: 'make' },
  { label: 'Model', key: 'model' },
  { label: 'Variant', key: 'variant' },
  { label: 'Year', key: 'model_year' },
  { label: 'Color', key: 'color' },
  { label: 'Fuel', key: 'fuel_type' },
  { label: 'Transmission', key: 'transmission' },
  { label: 'Engine', key: 'engine_capacity' },
  { label: 'Drive', key: 'drive_type' },
  { label: 'Body', key: 'body_type' },
  { label: 'Mileage', key: 'mileage', fmt: (v) => formatMileage(v as number) },
  { label: 'Demand Price', key: 'expected_selling_price', fmt: (v) => formatCurrency(v as number) },
  { label: 'Cost Price', key: 'purchase_price', fmt: (v) => formatCurrency(v as number) },
  { label: 'Status', key: 'status' },
  { label: 'Reg. City', key: 'registration_city' },
  { label: 'Origin', key: 'origin' },
  { label: 'Reg. Year', key: 'registration_year' },
];

const BOOL_ROWS: { label: string; key: keyof Vehicle }[] = [
  { label: 'ABS', key: 'has_abs' },
  { label: 'Android Panel', key: 'has_android_panel' },
  { label: 'Sunroof', key: 'has_sunroof' },
  { label: 'Reverse Camera', key: 'has_reverse_camera' },
  { label: 'Push Start', key: 'has_push_start' },
  { label: 'Leather Seats', key: 'has_alloy_wheels' },
  { label: 'Climate Control', key: 'has_climate_control' },
  { label: 'Cruise Control', key: 'has_cruise_control' },
];

export default function VehicleComparison() {
  const navigate = useNavigate();
  const [cars, setCars] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Vehicle[]>([]);
  const [loadingSugg, setLoadingSugg] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      setLoadingSugg(true);
      const { data } = await fetchVehicles({ search, pageSize: 8 });
      setSuggestions(data.filter(v => !cars.find(c => c.id === v.id)));
      setLoadingSugg(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, cars]);

  const addCar = (v: Vehicle) => {
    if (cars.length >= MAX) return;
    setCars(prev => [...prev, v]);
    setSearch('');
    setSuggestions([]);
  };

  const removeCar = (id: string) => setCars(prev => prev.filter(c => c.id !== id));

  const getBest = (key: keyof Vehicle): string | null => {
    if (key === 'expected_selling_price') {
      const vals = cars.map(c => c.expected_selling_price ?? Infinity);
      const min = Math.min(...vals);
      return min !== Infinity ? cars.find(c => c.expected_selling_price === min)?.id ?? null : null;
    }
    if (key === 'mileage') {
      const vals = cars.map(c => c.mileage ?? Infinity);
      const min = Math.min(...vals);
      return min !== Infinity ? cars.find(c => c.mileage === min)?.id ?? null : null;
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/inventory')} className="text-muted-foreground w-8 h-8 shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Compare Vehicles</h1>
            <p className="text-xs text-muted-foreground">{cars.length}/{MAX} selected · Side by side comparison</p>
          </div>
        </div>

        {/* Add car search */}
        {cars.length < MAX && (
          <div className="relative mb-6 max-w-sm">
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vehicle to add…"
              className="h-8 bg-muted/50 border-border text-sm pr-8"
            />
            {loadingSugg && <span className="absolute right-2 top-2 text-xs text-muted-foreground">…</span>}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {suggestions.map(v => (
                  <button
                    key={v.id}
                    onClick={() => addCar(v)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-8 h-6 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {v.cover_image_url
                        ? <img src={v.cover_image_url} alt="" className="w-full h-full object-cover" />
                        : <Car className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground">{v.make} {v.model} {v.variant}</span>
                      <span className="text-xs text-muted-foreground ml-2">{v.color} · {v.model_year}</span>
                    </div>
                    <span className="text-xs text-primary shrink-0">{formatCurrency(v.expected_selling_price)}</span>
                    <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {cars.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <Car className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Search and add vehicles above to compare</p>
          </div>
        )}

        {cars.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: `${200 + cars.length * 180}px` }}>
              {/* Header row */}
              <thead>
                <tr>
                  <th className="w-36 px-3 py-2 text-left text-xs font-medium text-muted-foreground sticky left-0 bg-background/95 z-10">Field</th>
                  {cars.map(car => (
                    <th key={car.id} className="px-3 py-2 min-w-[180px]">
                      <Card className="bg-card border-border p-3 text-left relative">
                        <button
                          onClick={() => removeCar(car.id)}
                          className="absolute top-2 right-2 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-full h-24 rounded-md bg-muted flex items-center justify-center overflow-hidden mb-2">
                          {car.cover_image_url
                            ? <img src={car.cover_image_url} alt="" className="w-full h-full object-cover" />
                            : <Car className="w-8 h-8 text-muted-foreground" />}
                        </div>
                        <p className="text-sm font-semibold text-foreground truncate">{car.make} {car.model}</p>
                        <p className="text-xs text-muted-foreground truncate">{car.variant}</p>
                        <Badge className="mt-1 text-[10px] bg-primary/10 text-primary border-primary/20">{car.status}</Badge>
                      </Card>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {ROWS.map(row => {
                  const bestId = getBest(row.key);
                  return (
                    <tr key={row.key} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-2 text-xs text-muted-foreground font-medium sticky left-0 bg-background/95 whitespace-nowrap z-10">{row.label}</td>
                      {cars.map(car => {
                        const raw = car[row.key];
                        const val = raw != null ? (row.fmt ? row.fmt(raw) : String(raw)) : '—';
                        const isBest = bestId === car.id;
                        return (
                          <td key={car.id} className={cn('px-3 py-2 text-sm whitespace-nowrap', isBest ? 'text-green-400 font-semibold' : 'text-foreground')}>
                            {val}
                            {isBest && <span className="ml-1 text-[10px] text-green-400">✓ Best</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={cars.length + 1} className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/20 sticky left-0">Features</td>
                </tr>
                {BOOL_ROWS.map(row => (
                  <tr key={row.key} className="hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-2 text-xs text-muted-foreground font-medium sticky left-0 bg-background/95 whitespace-nowrap z-10">{row.label}</td>
                    {cars.map(car => (
                      <td key={car.id} className="px-3 py-2">
                        {car[row.key]
                          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                          : <XCircle className="w-4 h-4 text-muted-foreground/40" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
