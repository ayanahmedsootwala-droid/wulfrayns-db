// Vehicle Status History — timeline of status changes for a vehicle
import React, { useEffect, useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, getStatusColor } from '@/lib/utils';
import { supabase } from '@/db/supabase';

interface StatusEvent {
  id: string;
  vehicle_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  vehicleId: string;
}

function relativeTime(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function VehicleStatusHistory({ vehicleId }: Props) {
  const [events, setEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('rpm_vehicle_status_history')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .limit(20);
      setEvents(data ?? []);
      setLoading(false);
    }
    load();
  }, [vehicleId]);

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2"><Skeleton className="h-4 w-36" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (events.length === 0) return null;

  const visible = expanded ? events : events.slice(0, 4);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="px-4 py-3 pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />Status History
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">{events.length} events</Badge>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-3">
            {visible.map((ev, i) => (
              <div key={ev.id} className="flex gap-3 items-start">
                {/* Dot */}
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 z-10 bg-background',
                  i === 0 ? 'border-primary' : 'border-border'
                )}>
                  <div className={cn('w-2 h-2 rounded-full', i === 0 ? 'bg-primary' : 'bg-muted-foreground/40')} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {ev.from_status && (
                      <>
                        <Badge className={cn('text-[10px] px-1.5 py-0', getStatusColor(ev.from_status))}>
                          {ev.from_status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge className={cn('text-[10px] px-1.5 py-0', getStatusColor(ev.to_status))}>
                      {ev.to_status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                      {relativeTime(ev.created_at)}
                    </span>
                  </div>
                  {ev.notes && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{ev.notes}</p>
                  )}
                  {ev.changed_by && (
                    <p className="text-[10px] text-muted-foreground/60">by {ev.changed_by}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {events.length > 4 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline w-full justify-center"
          >
            {expanded
              ? <><ChevronUp className="w-3 h-3" />Show less</>
              : <><ChevronDown className="w-3 h-3" />Show {events.length - 4} more</>
            }
          </button>
        )}
      </CardContent>
    </Card>
  );
}
