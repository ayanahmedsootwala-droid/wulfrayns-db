// Profit Tracker Widget — shows realized vs. expected profit across inventory
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Car, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/db/supabase';

interface ProfitStats {
  totalExpected: number;
  totalRealized: number;
  totalCost: number;
  vehicleCount: number;
  soldCount: number;
  avgMargin: number;
  topProfitVehicle: { make: string; model: string; profit: number } | null;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `PKR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `PKR ${(n / 1_000).toFixed(0)}K`;
  return `PKR ${n.toLocaleString()}`;
}

export default function ProfitTrackerWidget() {
  const [stats, setStats] = useState<ProfitStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('rpm_vehicles')
        .select('purchase_price_pkr, asking_price_pkr, sold_price_pkr, repair_cost_pkr, total_investment_pkr, expected_profit_pkr, status, make, model')
        .not('purchase_price_pkr', 'is', null);

      if (!data) { setLoading(false); return; }

      let totalExpected = 0, totalRealized = 0, totalCost = 0;
      let soldCount = 0;
      let topProfit = 0;
      let topVehicle: ProfitStats['topProfitVehicle'] = null;

      for (const v of data) {
        const cost = (v.total_investment_pkr ?? (v.purchase_price_pkr ?? 0) + (v.repair_cost_pkr ?? 0));
        totalCost += cost;
        const expProfit = v.expected_profit_pkr ?? ((v.asking_price_pkr ?? 0) - cost);
        totalExpected += expProfit;
        if (v.status === 'sold' && v.sold_price_pkr) {
          const realized = v.sold_price_pkr - cost;
          totalRealized += realized;
          soldCount++;
          if (realized > topProfit) {
            topProfit = realized;
            topVehicle = { make: v.make, model: v.model, profit: realized };
          }
        }
      }

      const avgMargin = totalCost > 0 ? (totalExpected / totalCost) * 100 : 0;

      setStats({
        totalExpected,
        totalRealized,
        totalCost,
        vehicleCount: data.length,
        soldCount,
        avgMargin,
        topProfitVehicle: topVehicle,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
        <CardContent><Skeleton className="h-20 w-full" /></CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const isPositive = stats.totalExpected >= 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-4 py-3 pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" />
          Profit Tracker
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">
          {stats.vehicleCount} vehicles
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Expected vs Realized */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Expected Profit</p>
            <p className={cn('text-base font-black', isPositive ? 'text-green-400' : 'text-red-400')}>
              {fmt(Math.abs(stats.totalExpected))}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              {isPositive ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
              {stats.avgMargin.toFixed(1)}% avg margin
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <p className="text-[10px] text-muted-foreground mb-1">Realized (Sold)</p>
            <p className={cn('text-base font-black', stats.totalRealized >= 0 ? 'text-primary' : 'text-red-400')}>
              {fmt(Math.abs(stats.totalRealized))}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Car className="w-3 h-3" />
              {stats.soldCount} sold
            </p>
          </div>
        </div>

        {/* Total cost */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total inventory cost</span>
          <span className="font-semibold text-foreground">{fmt(stats.totalCost)}</span>
        </div>

        {/* Top profit vehicle */}
        {stats.topProfitVehicle && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/8 border border-primary/20">
            <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {stats.topProfitVehicle.make} {stats.topProfitVehicle.model}
              </p>
              <p className="text-[10px] text-muted-foreground">Top profit vehicle</p>
            </div>
            <span className="text-xs font-bold text-green-400 shrink-0">
              {fmt(stats.topProfitVehicle.profit)}
            </span>
          </div>
        )}

        {stats.vehicleCount === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5" />
            Add purchase prices to track profit
          </div>
        )}
      </CardContent>
    </Card>
  );
}
