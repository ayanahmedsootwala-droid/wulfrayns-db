import React from 'react';
import { Phone, MessageSquare, Copy, Share2, MapPin, Camera, TrendingDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Vehicle } from '@/types/types';
import { formatCurrency } from '@/lib/utils';

interface Props {
  dealer: {
    name: string;
    phone?: string | null;
    whatsapp?: string | null;
    city?: string | null;
    area?: string | null;
  };
  vehicle?: Vehicle | null;
  size?: 'sm' | 'icon';
}

/** Normalize phone to E.164 with +92 country code for Pakistan.
 *  03xx-xxxxxxx  →  923xxxxxxxxx  (strip leading 0, prepend 92)
 *  +92 xxx…      →  92xxxxxxxxx   (strip +)
 *  already 92…   →  as-is
 */
function waPhone(p?: string | null): string | null {
  if (!p) return null;
  const digits = p.replace(/[^0-9]/g, '');
  if (digits.startsWith('92') && digits.length >= 11) return digits;          // already +92
  if (digits.startsWith('0') && digits.length >= 10) return '92' + digits.slice(1); // 03xx → 923xx
  if (digits.length >= 10) return '92' + digits;                               // bare 3xx format
  return digits;
}

function buildVehicleText(dealer: Props['dealer'], vehicle?: Vehicle | null): string {
  if (!vehicle) return `Hi ${dealer.name}, I'm contacting you from the dealer directory.`;
  const lines = [
    `Hi ${dealer.name}! 👋`,
    ``,
    `I'm interested in your vehicle listed below:`,
    ``,
    `🚗 *${vehicle.make} ${vehicle.model}${vehicle.variant ? ' ' + vehicle.variant : ''}* (${vehicle.model_year ?? '—'})`,
    vehicle.color ? `🎨 Color: ${vehicle.color}` : null,
    vehicle.mileage != null ? `📍 Mileage: ${vehicle.mileage.toLocaleString()} km` : null,
    vehicle.registration_year ? `📋 Reg Year: ${vehicle.registration_year}` : null,
    vehicle.transmission ? `⚙️ Transmission: ${vehicle.transmission}` : null,
    `💰 Demand: *${formatCurrency(vehicle.expected_selling_price)}*`,
    vehicle.dealer_city ? `📌 Location: ${vehicle.dealer_city}${vehicle.dealer?.area ? ', ' + vehicle.dealer.area : ''}` : null,
    ``,
    `Please confirm if still available. Thank you!`,
  ].filter(l => l !== null);
  return lines.join('\n');
}

function buildRequestPhotos(dealer: Props['dealer'], vehicle?: Vehicle | null): string {
  if (!vehicle) return `Hi ${dealer.name}, can you please share photos?`;
  return `Hi ${dealer.name}! Can you please share photos of your *${vehicle.make} ${vehicle.model} ${vehicle.variant ?? ''}*? Thank you.`;
}

function buildRequestDemand(dealer: Props['dealer'], vehicle?: Vehicle | null): string {
  if (!vehicle) return `Hi ${dealer.name}, what is your best price?`;
  return `Hi ${dealer.name}! What is the *updated demand* for your ${vehicle.make} ${vehicle.model}${vehicle.variant ? ' ' + vehicle.variant : ''}? Last listed at ${formatCurrency(vehicle.expected_selling_price)}.`;
}

export default function WhatsAppActions({ dealer, vehicle, size = 'icon' }: Props) {
  const phone = waPhone(dealer.phone);
  const wa = waPhone(dealer.whatsapp) ?? phone;

  const call = () => { if (phone) window.open(`tel:${phone}`); else toast.error('No phone number'); };

  const openWA = (msg: string) => {
    if (!wa) { toast.error('No WhatsApp number'); return; }
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const copyPhone = () => {
    if (!phone) { toast.error('No phone number'); return; }
    navigator.clipboard.writeText(phone).then(() => toast.success('Phone copied!'));
  };

  const shareVehicle = async () => {
    const vehicleUrl = vehicle ? `${window.location.origin}/inventory/${vehicle.id}` : window.location.href;
    const text = vehicle
      ? `${vehicle.make} ${vehicle.model} ${vehicle.variant ?? ''} (${vehicle.model_year}) — ${formatCurrency(vehicle.expected_selling_price)}\n${vehicleUrl}`
      : vehicleUrl;
    if (navigator.share) {
      await navigator.share({ title: vehicle ? `${vehicle.make} ${vehicle.model}` : dealer.name, text, url: vehicleUrl });
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success('Link copied!'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {size === 'icon' ? (
          <Button variant="outline" size="icon" className="w-8 h-8 border-border text-muted-foreground hover:text-green-400 hover:border-green-400/30" title="WhatsApp Actions">
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="border-border text-xs h-8 text-muted-foreground hover:text-green-400 hover:border-green-400/30">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5 text-green-400" />Actions
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 bg-popover border-border">
        <DropdownMenuItem onClick={call} className="gap-2 text-xs cursor-pointer">
          <Phone className="w-3.5 h-3.5 text-blue-400" /> Call {dealer.name.split(' ')[0]}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openWA(buildVehicleText(dealer, vehicle))} className="gap-2 text-xs cursor-pointer">
          <MessageSquare className="w-3.5 h-3.5 text-green-400" /> WhatsApp — Send Details
        </DropdownMenuItem>
        {vehicle && (
          <>
            <DropdownMenuItem onClick={() => openWA(buildRequestPhotos(dealer, vehicle))} className="gap-2 text-xs cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-purple-400" /> Request Photos
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openWA(buildRequestDemand(dealer, vehicle))} className="gap-2 text-xs cursor-pointer">
              <TrendingDown className="w-3.5 h-3.5 text-yellow-400" /> Request Updated Demand
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem onClick={copyPhone} className="gap-2 text-xs cursor-pointer">
          <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Copy Number
        </DropdownMenuItem>
        <DropdownMenuItem onClick={shareVehicle} className="gap-2 text-xs cursor-pointer">
          <Share2 className="w-3.5 h-3.5 text-muted-foreground" /> Share Vehicle Link
        </DropdownMenuItem>
        {dealer.city && (
          <DropdownMenuItem
            onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(`${dealer.name}, ${dealer.city}${dealer.area ? ', ' + dealer.area : ''}`)}`, '_blank')}
            className="gap-2 text-xs cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-red-400" /> Send Location
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
