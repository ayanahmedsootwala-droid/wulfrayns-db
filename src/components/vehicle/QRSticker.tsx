import React, { useRef } from 'react';
import { QrCode, Printer, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import type { Vehicle } from '@/types/types';

interface Props {
  vehicle: Vehicle;
  open: boolean;
  onClose: () => void;
}

export default function QRSticker({ vehicle, open, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const url = `${window.location.origin}/inventory/${vehicle.id}`;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    win.document.write(`
      <html><head><title>QR Sticker — ${vehicle.make} ${vehicle.model}</title>
      <style>
        body { margin: 0; padding: 24px; font-family: 'Arial', sans-serif; background: #fff; color: #000; display: flex; justify-content: center; }
        .sticker { border: 2px solid #000; border-radius: 12px; padding: 20px; width: 280px; text-align: center; }
        .title { font-size: 16px; font-weight: 700; margin-bottom: 2px; }
        .sub { font-size: 12px; color: #555; margin-bottom: 12px; }
        img { width: 180px; height: 180px; }
        .label { font-size: 10px; color: #888; margin-top: 10px; word-break: break-all; }
        .price { font-size: 18px; font-weight: 700; margin-top: 8px; color: #000; }
        .badge { display: inline-block; background: #f0f0f0; border-radius: 4px; padding: 2px 8px; font-size: 10px; margin-top: 4px; }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-[calc(100%-2rem)] md:max-w-sm p-0">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">QR Sticker</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center px-4 pb-2">
          <div ref={printRef} className="sticker border-2 border-foreground/20 rounded-xl p-5 w-64 text-center bg-white text-black">
            <p className="title text-base font-bold">{vehicle.make} {vehicle.model}</p>
            <p className="sub text-xs text-gray-500 mb-3">{vehicle.variant} · {vehicle.color} · {vehicle.model_year}</p>
            <div className="flex justify-center">
              <QRCodeDataUrl text={url} width={160} />
            </div>
            {vehicle.expected_selling_price && (
              <p className="price text-lg font-bold mt-2">
                PKR {vehicle.expected_selling_price.toLocaleString()}
              </p>
            )}
            <span className="badge text-xs bg-gray-100 rounded px-2 py-0.5 mt-1 inline-block">
              {vehicle.stock_number || vehicle.id.slice(0, 8).toUpperCase()}
            </span>
            <p className="label text-[10px] text-gray-400 mt-2 break-all">{url}</p>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-4 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 border-border text-xs h-8">
            <X className="w-3.5 h-3.5 mr-1" />Close
          </Button>
          <Button size="sm" onClick={handlePrint} className="flex-1 text-xs h-8">
            <Printer className="w-3.5 h-3.5 mr-1" />Print Sticker
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
