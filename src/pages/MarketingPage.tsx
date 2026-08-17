/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Megaphone, Plus, Search, Trash2, Edit3, Eye, Send,
  Clock, CheckCircle2, XCircle, BarChart3, TrendingUp,
  MessageSquare, Mail, Phone, Instagram, Globe, Share2,
  Zap, Star, Target, Users, Calendar, RefreshCw,
  Copy, Download, Filter, ChevronDown, X, Loader2,
  Layers, Bookmark, Bell, ArrowRight, Hash, Image as ImageIcon,
  PlusCircle, ToggleLeft, ToggleRight, ChevronRight,
  PlayCircle, PauseCircle, RotateCcw, Sparkles, FileText,
  Activity, MoreHorizontal, CheckSquare, AlertTriangle, Bot,
} from 'lucide-react';
import { streamLLMQueued } from '@/lib/ai-client';
import { getSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AppLayout from '@/components/layouts/AppLayout';
import { supabase } from '@/db/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ────────────────────────────────────────────────────────────────────
type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
type CampaignChannel = 'whatsapp' | 'sms' | 'email' | 'instagram' | 'facebook' | 'web';
type TemplateCategory = 'promotion' | 'follow_up' | 'announcement' | 'inventory' | 'seasonal' | 'event' | 'social_proof' | 'brand' | 'educational';

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  channel: CampaignChannel;
  audience: string;
  audience_count: number;
  message_template: string;
  scheduled_at?: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  created_at: string;
  tags: string[];
  budget?: number;
  spent?: number;
}

interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  channel: CampaignChannel;
  content: string;
  variables: string[];
  usage_count: number;
  created_at: string;
}

interface Lead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  city?: string;
  status?: string;
}

// ─── Channel config ───────────────────────────────────────────────────────────
const CHANNEL_CONFIG: Record<CampaignChannel, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  whatsapp: { label: 'WhatsApp', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', icon: MessageSquare },
  sms:      { label: 'SMS',      color: 'text-blue-400',  bg: 'bg-blue-400/10 border-blue-400/20',  icon: Phone },
  email:    { label: 'Email',    color: 'text-purple-400',bg: 'bg-purple-400/10 border-purple-400/20',icon: Mail },
  instagram:{ label: 'Instagram',color: 'text-pink-400',  bg: 'bg-pink-400/10 border-pink-400/20',  icon: Instagram },
  facebook: { label: 'Facebook', color: 'text-blue-500',  bg: 'bg-blue-500/10 border-blue-500/20',  icon: Globe },
  web:      { label: 'Web Push', color: 'text-orange-400',bg: 'bg-orange-400/10 border-orange-400/20',icon: Bell },
};

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:     { label: 'Draft',     color: 'text-muted-foreground bg-muted border-border',            icon: Edit3 },
  scheduled: { label: 'Scheduled', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',        icon: Clock },
  active:    { label: 'Active',    color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',icon: PlayCircle },
  paused:    { label: 'Paused',    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',   icon: PauseCircle },
  completed: { label: 'Completed', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',        icon: CheckCircle2 },
  archived:  { label: 'Archived',  color: 'text-muted-foreground bg-muted/60 border-border',        icon: Bookmark },
};

// ─── Built-in templates ───────────────────────────────────────────────────────
const BUILT_IN_TEMPLATES: Omit<Template, 'id' | 'created_at' | 'usage_count'>[] = [
  {
    name: 'New Arrival Announcement',
    category: 'inventory',
    channel: 'whatsapp',
    content: '🚗 *New Arrival at Wulfrayn\'s DB!*\n\n{{make}} {{model}} {{variant}} — {{year}}\n💰 Price: PKR {{price}}\n📍 {{color}} | {{mileage}} km | {{transmission}}\n\nLimited stock. Call us now: +92-300-0000000\n\n_Wulfrayn\'s DB — Drive Your Dream_',
    variables: ['make', 'model', 'variant', 'year', 'price', 'color', 'mileage', 'transmission'],
  },
  {
    name: 'Price Drop Alert',
    category: 'promotion',
    channel: 'whatsapp',
    content: '🔥 *PRICE DROP ALERT!*\n\n{{make}} {{model}} — now at PKR {{new_price}}\n~~Was: PKR {{old_price}}~~\n\nSave PKR {{savings}} — offer valid till {{expiry}}\n\nBook now: +92-300-0000000',
    variables: ['make', 'model', 'new_price', 'old_price', 'savings', 'expiry'],
  },
  {
    name: 'Lead Follow-Up (Day 1)',
    category: 'follow_up',
    channel: 'whatsapp',
    content: 'Assalam o Alaikum {{customer_name}}! 👋\n\nThank you for your interest in the *{{make}} {{model}}*.\n\nWould you like to schedule a test drive? We\'re available 7 days a week.\n\n📞 {{sales_rep}} — Wulfrayn\'s DB',
    variables: ['customer_name', 'make', 'model', 'sales_rep'],
  },
  {
    name: 'Lead Follow-Up (Day 7)',
    category: 'follow_up',
    channel: 'whatsapp',
    content: 'Hi {{customer_name}}!\n\nJust checking in regarding the *{{make}} {{model}}* you enquired about.\n\n✅ Still available\n💰 Price: PKR {{price}}\n🎯 Easy installment plans available\n\nReply "interested" to proceed. — Wulfrayn\'s DB',
    variables: ['customer_name', 'make', 'model', 'price'],
  },
  {
    name: 'Eid Special Offer',
    category: 'seasonal',
    channel: 'whatsapp',
    content: '🌙 *Eid Mubarak from Wulfrayn\'s DB!*\n\nThis Eid, drive home your dream car!\n\n🎁 Special Eid discounts up to PKR {{discount}}\n📋 Easy 0% markup financing\n🚗 {{total_vehicles}}+ vehicles in stock\n\nVisit us: {{address}}\nCall: +92-300-0000000',
    variables: ['discount', 'total_vehicles', 'address'],
  },
  {
    name: 'Test Drive Reminder',
    category: 'follow_up',
    channel: 'sms',
    content: 'Reminder: Your test drive for {{make}} {{model}} is scheduled for {{date}} at {{time}}. Wulfrayn\'s DB, {{address}}. Call +92-300-0000000 to reschedule.',
    variables: ['make', 'model', 'date', 'time', 'address'],
  },
  {
    name: 'Monthly Inventory Newsletter',
    category: 'announcement',
    channel: 'email',
    content: `Subject: {{month}} New Arrivals — Wulfrayn\'s DB\n\nDear {{customer_name}},\n\nWe have {{new_count}} new vehicles this month including:\n\n{{vehicle_list}}\n\nVisit our showroom or browse online.\n\nBest regards,\nWulfrayn\'s DB Team`,
    variables: ['month', 'customer_name', 'new_count', 'vehicle_list'],
  },
  {
    name: 'Social Media Vehicle Post',
    category: 'inventory',
    channel: 'instagram',
    content: '✨ JUST ARRIVED ✨\n\n{{make}} {{model}} {{variant}} {{year}}\n\n🎨 Color: {{color}}\n⚙️ {{transmission}} | {{fuel_type}}\n💰 PKR {{price}}\n📍 {{city}}\n\nDM or call +92-300-0000000\n\n#RPMMotors #{{make}} #{{model}} #CarSale #Pakistan #Lahore',
    variables: ['make', 'model', 'variant', 'year', 'color', 'transmission', 'fuel_type', 'price', 'city'],
  },
  // ── Additional social media templates ──────────────────────────────────────
  {
    name: 'Instagram — Weekend Flash Sale',
    category: 'promotion',
    channel: 'instagram',
    content: '⚡ WEEKEND FLASH SALE ⚡\n\nLimited-time deals at Wulfrayn\'s DB!\n\n🏷️ Discounts up to PKR {{discount}}\n🚗 {{total_cars}}+ vehicles available\n📅 {{start_date}} – {{end_date}} only\n\n📲 DM us or call +92-300-0000000\n📍 {{city}}\n\n#FlashSale #RPMMotors #CarDeals #Pakistan #LahoreAutos #UsedCars',
    variables: ['discount', 'total_cars', 'start_date', 'end_date', 'city'],
  },
  {
    name: 'Instagram — Luxury Car Showcase',
    category: 'inventory',
    channel: 'instagram',
    content: '👑 LUXURY REDEFINED 👑\n\n{{make}} {{model}} {{variant}}\n{{year}} | {{color}} | {{mileage}} km\n\n✅ Fully Verified\n✅ Inspection Certified\n✅ Finance Available\n\n💰 PKR {{price}}\n\nCall / WhatsApp: +92-300-0000000\n\n#LuxuryCars #{{make}} #{{model}} #RPMMotors #DreamCar #Lahore',
    variables: ['make', 'model', 'variant', 'year', 'color', 'mileage', 'price'],
  },
  {
    name: 'Instagram — Transformation Tuesday',
    category: 'announcement',
    channel: 'instagram',
    content: '🧽 TRANSFORMATION TUESDAY 🧽\n\n{{make}} {{model}} {{year}} — fresh detailing done!\n\nSwipe to see before & after ➡️\n\n🔑 Now available for sale\n💰 PKR {{price}}\n📞 +92-300-0000000\n\n#Detailing #CarCare #RPMMotors #{{make}} #CarShowroom',
    variables: ['make', 'model', 'year', 'price'],
  },
  {
    name: 'Instagram — Customer Delivery',
    category: 'event',
    channel: 'instagram',
    content: '⭐⭐⭐⭐⭐ HAPPY CUSTOMER! ⭐⭐⭐⭐⭐\n\n"{{testimonial_quote}}" — {{customer_name}}, {{city}}\n\nThank you for trusting Wulfrayn\'s DB! 🙏🚗\n\n{{make}} {{model}} {{year}} delivered on {{delivery_date}}\n\n#HappyCustomer #RPMMotors #CustomerLove #CarDelivery #Pakistan',
    variables: ['testimonial_quote', 'customer_name', 'city', 'make', 'model', 'year', 'delivery_date'],
  },
  {
    name: 'Instagram — SUV Collection Reel',
    category: 'inventory',
    channel: 'instagram',
    content: '🏔️ TOP SUVs IN STOCK 🔥\n\n1️⃣ {{suv1_name}} — PKR {{suv1_price}}\n2️⃣ {{suv2_name}} — PKR {{suv2_price}}\n3️⃣ {{suv3_name}} — PKR {{suv3_price}}\n\nVerified • Finance available • Test drive welcome\n\n📍 {{city}} | 📞 +92-300-0000000\n\n#SUV #4x4 #RPMMotors #Pakistan #OffRoad #LuxurySUV',
    variables: ['suv1_name', 'suv1_price', 'suv2_name', 'suv2_price', 'suv3_name', 'suv3_price', 'city'],
  },
  {
    name: 'Instagram — Hybrid & EV Highlight',
    category: 'inventory',
    channel: 'instagram',
    content: '🌿 GO GREEN WITH RPM MOTORS 🌿\n\nTop Hybrid & Electric cars in stock:\n\n🔋 {{ev1_name}} — PKR {{ev1_price}}\n🔋 {{ev2_name}} — PKR {{ev2_price}}\n🔋 {{ev3_name}} — PKR {{ev3_price}}\n\n💡 Save on fuel | ✅ Verified\n📞 +92-300-0000000\n\n#HybridCar #ElectricVehicle #EV #RPMMotors #GoGreen #Pakistan',
    variables: ['ev1_name', 'ev1_price', 'ev2_name', 'ev2_price', 'ev3_name', 'ev3_price'],
  },
  // ── 10 extra Instagram templates ──────────────────────────────────────────
  {
    name: 'Instagram — Price Drop Alert',
    category: 'promotion',
    channel: 'instagram',
    content: '🔥 PRICE DROP ALERT! 🔥\n\n{{make}} {{model}} {{year}}\nWas: PKR {{old_price}}\nNOW: PKR {{new_price}}\n💰 Save PKR {{savings}}!\n\n✅ {{mileage}}km | {{fuel}} | {{transmission}}\n📞 Book now: +92-300-0000000\n\n#PriceDrop #{{make}} #{{model}} #RPMMotors #CarDeals #Pakistan',
    variables: ['make', 'model', 'year', 'old_price', 'new_price', 'savings', 'mileage', 'fuel', 'transmission'],
  },
  {
    name: 'Instagram — Sold Car Celebration',
    category: 'social_proof',
    channel: 'instagram',
    content: '🎊 ANOTHER HAPPY CUSTOMER! 🎊\n\nCongratulations {{customer_name}} on your new {{make}} {{model}} {{year}}! 🚗💨\n\n"{{testimonial}}"\n— {{customer_name}}, {{city}}\n\nThank you for trusting Wulfrayn\'s DB! 🙏\n📞 +92-300-0000000\n\n#HappyCustomer #NewCar #{{make}} #RPMMotors #CarLife #Pakistan',
    variables: ['customer_name', 'make', 'model', 'year', 'testimonial', 'city'],
  },
  {
    name: 'Instagram — Limited Stock Urgency',
    category: 'promotion',
    channel: 'instagram',
    content: '⚠️ LAST {{count}} UNITS! ⚠️\n\n{{make}} {{model}} {{year}} — Only {{count}} left in stock!\n\n💰 PKR {{price}}\n🔋 {{fuel}} | ⚙️ {{transmission}}\n📍 {{city}}\n\n⏳ Once gone, gone! Call NOW.\n📞 +92-300-0000000\n\n#LimitedStock #{{make}} #{{model}} #RPMMotors #HurryUp #Pakistan',
    variables: ['count', 'make', 'model', 'year', 'price', 'fuel', 'transmission', 'city'],
  },
  {
    name: 'Instagram — Financing Spotlight',
    category: 'promotion',
    channel: 'instagram',
    content: '💳 OWN YOUR DREAM CAR TODAY!\n\n{{make}} {{model}} {{year}}\nPrice: PKR {{price}}\n\n💰 Easy Finance:\n• Down: {{down_pct}}% — PKR {{down_amount}}\n• Monthly: PKR {{monthly}}\n• Tenure: {{tenure}} years\n\nZero hidden charges ✅\n📞 +92-300-0000000\n\n#CarFinance #Installment #{{make}} #RPMMotors #DreamCar',
    variables: ['make', 'model', 'year', 'price', 'down_pct', 'down_amount', 'monthly', 'tenure'],
  },
  {
    name: 'Instagram — Behind the Scenes',
    category: 'brand',
    channel: 'instagram',
    content: '🔧 BEHIND THE SCENES AT RPM MOTORS 🔧\n\nEvery car goes through our {{step_count}}-step inspection before it reaches you:\n\n🔍 {{step1}}\n🔍 {{step2}}\n🔍 {{step3}}\n🔍 {{step4}}\n\nYour peace of mind is our priority! 💯\n📞 +92-300-0000000\n\n#BehindTheScenes #CarInspection #RPMMotors #QualityAssurance',
    variables: ['step_count', 'step1', 'step2', 'step3', 'step4'],
  },
  {
    name: 'Instagram — Weekly Top Pick',
    category: 'inventory',
    channel: 'instagram',
    content: '⭐ THIS WEEK\'S TOP PICK ⭐\n\n{{make}} {{model}} {{variant}} {{year}}\n\n🏷️ PKR {{price}}\n📏 {{mileage}} km\n⛽ {{fuel}} | ⚙️ {{transmission}}\n🎨 {{color}}\n\n✅ Full inspection done\n✅ Papers clear\n📞 +92-300-0000000\n\n#WeeklyPick #{{make}} #{{model}} #RPMMotors #UsedCar #Pakistan',
    variables: ['make', 'model', 'variant', 'year', 'price', 'mileage', 'fuel', 'transmission', 'color'],
  },
  {
    name: 'Instagram — Showroom Tour',
    category: 'brand',
    channel: 'instagram',
    content: '🏢 VISIT OUR SHOWROOM! 🏢\n\n{{vehicle_count}}+ vehicles waiting for you at Wulfrayn\'s DB {{city}}!\n\n📍 {{address}}\n🕘 Open: {{hours}}\n📞 +92-300-0000000\n\nSwipe to see what\'s in stock 👉\n\n#Showroom #RPMMotors #{{city}} #CarShopping #PakistanCars #UsedCars',
    variables: ['vehicle_count', 'city', 'address', 'hours'],
  },
  {
    name: 'Instagram — Comparison Post',
    category: 'educational',
    channel: 'instagram',
    content: '🤔 {{car1}} vs {{car2}} — Which is better for Pakistan?\n\n{{car1}}:\n✅ {{car1_pro1}}\n✅ {{car1_pro2}}\n❌ {{car1_con}}\n\n{{car2}}:\n✅ {{car2_pro1}}\n✅ {{car2_pro2}}\n❌ {{car2_con}}\n\nOur verdict: {{verdict}} 🏆\n\nBoth available at Wulfrayn\'s DB 📞 +92-300-0000000\n\n#CarComparison #{{car1}} #{{car2}} #RPMMotors',
    variables: ['car1', 'car2', 'car1_pro1', 'car1_pro2', 'car1_con', 'car2_pro1', 'car2_pro2', 'car2_con', 'verdict'],
  },
  {
    name: 'Instagram — Eid Special Offer',
    category: 'seasonal',
    channel: 'instagram',
    content: '🌙✨ EID MUBARAK FROM RPM MOTORS! ✨🌙\n\nCelebrate Eid with a new ride! 🚗\n\n🎁 PKR {{discount}} off all vehicles\n🎁 Free 1st service on purchase\n🎁 {{down_pct}}% down payment offer\n🎁 Same-day delivery available\n\n⏳ Eid offer valid {{start}} – {{end}}\n📞 +92-300-0000000\n\n#EidMubarak #EidSpecial #RPMMotors #NewCar #Pakistan',
    variables: ['discount', 'down_pct', 'start', 'end'],
  },
  {
    name: 'Instagram — Car Care Tips',
    category: 'educational',
    channel: 'instagram',
    content: '🛠️ {{tip_number}} CAR CARE TIPS FOR PAKISTAN ROADS 🛠️\n\n1️⃣ {{tip1}}\n2️⃣ {{tip2}}\n3️⃣ {{tip3}}\n4️⃣ {{tip4}}\n5️⃣ {{tip5}}\n\nSave this post! 📌\n\nNeed a well-maintained car? Wulfrayn\'s DB has you covered.\n📞 +92-300-0000000\n\n#CarCare #CarTips #RPMMotors #Pakistan #AutoMaintenance',
    variables: ['tip_number', 'tip1', 'tip2', 'tip3', 'tip4', 'tip5'],
  },
  // ── End extra Instagram templates ─────────────────────────────────────────

  {
    name: 'Facebook — Inventory Update',
    category: 'inventory',
    channel: 'facebook',
    content: '🚗 NEW INVENTORY UPDATE — Wulfrayn\'s DB!\n\n{{new_count}} fresh vehicles just added!\n\n🔑 Featured Arrivals:\n{{vehicle_list}}\n\n💳 Easy installment plans\n🔍 Verified & Inspected\n📞 Call or WhatsApp: +92-300-0000000\n📍 {{address}}',
    variables: ['new_count', 'vehicle_list', 'address'],
  },
  {
    name: 'Facebook — Monthly Offer Campaign',
    category: 'promotion',
    channel: 'facebook',
    content: '🎉 {{month}} SPECIAL OFFERS at Wulfrayn\'s DB!\n\n✅ Up to PKR {{discount}} off selected vehicles\n✅ 0% markup on {{tenor}}-year finance\n✅ Free registration assistance\n✅ Free 1-year warranty on select models\n\n📞 +92-300-0000000 | 📍 {{address}}\n\n⏳ Valid till {{expiry}}. T&Cs apply.',
    variables: ['month', 'discount', 'tenor', 'address', 'expiry'],
  },
  {
    name: 'Facebook — Ramadan Special',
    category: 'seasonal',
    channel: 'facebook',
    content: '🌙 Ramadan Mubarak from Wulfrayn\'s DB! 🌙\n\nBlessing this holy month with special deals:\n\n✨ PKR {{discount}} discount on select models\n✨ Easy {{installment}} monthly installments\n✨ Free vehicle inspection\n✨ Flexible down payment from {{down_pct}}%\n\n📞 +92-300-0000000 | 📍 {{address}}',
    variables: ['discount', 'installment', 'down_pct', 'address'],
  },
  {
    name: 'Facebook — Event Invitation',
    category: 'event',
    channel: 'facebook',
    content: '📢 YOU\'RE INVITED — Wulfrayn\'s DB {{event_name}}!\n\n📅 {{event_date}} ⏰ {{event_time}}\n📍 {{venue}}\n\n🚗 Exclusive displays | 🎁 On-day discounts | ☕ Refreshments\n🏆 {{event_highlight}}\n\nFree entry — RSVP: +92-300-0000000\nTag a friend who loves cars! 👇',
    variables: ['event_name', 'event_date', 'event_time', 'venue', 'event_highlight'],
  },
  {
    name: 'WhatsApp — Quotation Follow-Up',
    category: 'follow_up',
    channel: 'whatsapp',
    content: 'Assalam o Alaikum {{customer_name}}! 🙏\n\nQuote for *{{make}} {{model}} {{year}}* sent on {{quote_date}}:\n\n• Price: PKR {{price}}\n• Down ({{down_pct}}%): PKR {{down_amount}}\n• Monthly: PKR {{monthly}}\n\nValid till {{expiry}}. Reply YES to reserve! 🚗\n\n📞 Wulfrayn\'s DB +92-300-0000000',
    variables: ['customer_name', 'make', 'model', 'year', 'price', 'down_pct', 'down_amount', 'monthly', 'quote_date', 'expiry'],
  },
  {
    name: 'WhatsApp — Re-engagement (Cold Lead)',
    category: 'follow_up',
    channel: 'whatsapp',
    content: 'Hi {{customer_name}} 👋 It\'s been a while!\n\n{{total_vehicles}}+ cars matching your preference now in stock:\n✅ {{make}} from PKR {{min_price}}–{{max_price}}\n✅ {{fuel_type}} variants available\n✅ Finance from {{down_pct}}% down\n\nStill looking? We\'d love to help!\n📞 {{sales_rep}} — Wulfrayn\'s DB',
    variables: ['customer_name', 'total_vehicles', 'make', 'min_price', 'max_price', 'fuel_type', 'down_pct', 'sales_rep'],
  },
  {
    name: 'WhatsApp — Vehicle Sold Thank You',
    category: 'event',
    channel: 'whatsapp',
    content: '🎉 Congratulations {{customer_name}}!\n\nYour *{{make}} {{model}} {{year}}* has been delivered! 🚗\n\nThank you for choosing Wulfrayn\'s DB 🙏\n\n⭐ Share your experience: {{review_link}}\n📞 After-sale support: +92-300-0000000\n\n_Wulfrayn\'s DB — Drive Your Dream_',
    variables: ['customer_name', 'make', 'model', 'year', 'review_link'],
  },
  {
    name: 'WhatsApp — New Stock Alert',
    category: 'inventory',
    channel: 'whatsapp',
    content: '🔔 *New Stock Alert!*\n\nHi {{customer_name}}, a car matching your wishlist arrived:\n\n🚗 {{make}} {{model}} {{variant}} ({{year}})\n🎨 {{color}} | ⚙️ {{transmission}} | ⛽ {{fuel_type}}\n📏 {{mileage}} km | 💰 PKR {{price}}\n\nFirst come first served — reply now!\n📞 Wulfrayn\'s DB +92-300-0000000',
    variables: ['customer_name', 'make', 'model', 'variant', 'year', 'color', 'transmission', 'fuel_type', 'mileage', 'price'],
  },
  {
    name: 'SMS — Quick Deal Alert',
    category: 'promotion',
    channel: 'sms',
    content: 'Wulfrayn\'s DB: {{make}} {{model}} {{year}} PKR {{price}} — limited offer! Finance avail. Call +92-300-0000000. Reply STOP to opt out.',
    variables: ['make', 'model', 'year', 'price'],
  },
  {
    name: 'SMS — Appointment Confirmation',
    category: 'event',
    channel: 'sms',
    content: 'Wulfrayn\'s DB: Your visit is confirmed — {{date}} at {{time}}. Address: {{address}}. Queries? Call +92-300-0000000.',
    variables: ['date', 'time', 'address'],
  },
  {
    name: 'Email — Welcome New Customer',
    category: 'follow_up',
    channel: 'email',
    content: 'Subject: Welcome to Wulfrayn\'s DB, {{customer_name}}!\n\nDear {{customer_name}},\n\nThank you for reaching out! We\'re excited to find you the perfect car.\n\nEnquiry: {{req_make}} {{req_model}} | Budget: PKR {{budget}}\nAssigned to: {{sales_rep}}\n\nExpect a call within 24 hours.\n\nKind regards,\n{{sales_rep}} | Wulfrayn\'s DB +92-300-0000000',
    variables: ['customer_name', 'req_make', 'req_model', 'budget', 'sales_rep'],
  },
  {
    name: 'Email — Inspection Report',
    category: 'announcement',
    channel: 'email',
    content: 'Subject: Inspection Report — {{make}} {{model}} {{year}}\n\nDear {{customer_name}},\n\nInspection summary for {{make}} {{model}} {{variant}} ({{year}}):\n\nScore: {{score}}/100\nEngine: {{engine_status}}\nTransmission: {{transmission_status}}\nExterior: {{exterior_status}}\nInterior: {{interior_status}}\n\nFull report attached. Questions? Reply to this email.\n\nWulfrayn\'s DB',
    variables: ['customer_name', 'make', 'model', 'variant', 'year', 'score', 'engine_status', 'transmission_status', 'exterior_status', 'interior_status'],
  },
];

// ─── Automation rules ─────────────────────────────────────────────────────────
interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  channel: CampaignChannel;
  enabled: boolean;
  runs: number;
}

const DEFAULT_AUTOMATIONS: AutomationRule[] = [
  { id: 'a1', name: 'New Lead Welcome', trigger: 'Lead created', action: 'Send WhatsApp welcome + follow-up template', channel: 'whatsapp', enabled: true, runs: 0 },
  { id: 'a2', name: '7-Day Follow-Up', trigger: 'Lead inactive 7 days', action: 'Send Day-7 follow-up message', channel: 'whatsapp', enabled: true, runs: 0 },
  { id: 'a3', name: 'Price Drop Alert', trigger: 'Vehicle price reduced', action: 'Notify interested leads via WhatsApp', channel: 'whatsapp', enabled: false, runs: 0 },
  { id: 'a4', name: 'New Inventory Post', trigger: 'Vehicle added to inventory', action: 'Draft Instagram post template', channel: 'instagram', enabled: true, runs: 0 },
  { id: 'a5', name: 'Test Drive Reminder', trigger: '24h before test drive', action: 'Send SMS reminder', channel: 'sms', enabled: true, runs: 0 },
  { id: 'a6', name: 'Sold Car Follow-Up', trigger: 'Vehicle marked sold', action: 'Send WhatsApp thank you + review request', channel: 'whatsapp', enabled: true, runs: 0 },
  { id: 'a7', name: 'Monthly Newsletter', trigger: '1st of every month', action: 'Send email newsletter to all customers', channel: 'email', enabled: false, runs: 0 },
];

// ─── Metrics card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, trend, color = 'text-foreground' }: {
  label: string; value: string | number; sub?: string; trend?: number; color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn('text-2xl font-black', color)}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {trend !== undefined && (
        <p className={cn('text-[10px] font-semibold flex items-center gap-0.5', trend >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          <TrendingUp className="w-2.5 h-2.5" /> {trend >= 0 ? '+' : ''}{trend}% vs last month
        </p>
      )}
    </div>
  );
}

// ─── Campaign card ────────────────────────────────────────────────────────────
function CampaignCard({ c, onEdit, onDelete, onToggle }: {
  c: Campaign;
  onEdit: (c: Campaign) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, status: CampaignStatus) => void;
}) {
  const ch = CHANNEL_CONFIG[c.channel];
  const st = STATUS_CONFIG[c.status];
  const openRate = c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0;
  const clickRate = c.opened_count > 0 ? Math.round((c.clicked_count / c.opened_count) * 100) : 0;
  const convRate = c.sent_count > 0 ? Math.round((c.converted_count / c.sent_count) * 100) : 0;
  const ChIcon = ch.icon;
  const StIcon = st.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card hover:border-primary/30 transition-all p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center shrink-0', ch.bg)}>
            <ChIcon className={cn('w-4 h-4', ch.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
            <p className="text-[10px] text-muted-foreground">{ch.label} · {c.audience}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border', st.color)}>
            <StIcon className="w-2.5 h-2.5" /> {st.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem onClick={() => onEdit(c)}><Edit3 className="w-3 h-3 mr-2" /> Edit</DropdownMenuItem>
              {c.status === 'active'
                ? <DropdownMenuItem onClick={() => onToggle(c.id, 'paused')}><PauseCircle className="w-3 h-3 mr-2" /> Pause</DropdownMenuItem>
                : c.status === 'paused'
                  ? <DropdownMenuItem onClick={() => onToggle(c.id, 'active')}><PlayCircle className="w-3 h-3 mr-2" /> Resume</DropdownMenuItem>
                  : null
              }
              <DropdownMenuItem onClick={() => onToggle(c.id, 'archived')} className="text-muted-foreground">
                <Bookmark className="w-3 h-3 mr-2" /> Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(c.id)} className="text-destructive">
                <Trash2 className="w-3 h-3 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Metrics row */}
      {c.sent_count > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Sent',     value: c.sent_count },
            { label: 'Open%',    value: `${openRate}%`,  accent: openRate > 40 },
            { label: 'Click%',   value: `${clickRate}%`, accent: clickRate > 20 },
            { label: 'Conv%',    value: `${convRate}%`,  accent: convRate > 5 },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className={cn('text-sm font-bold', m.accent ? 'text-emerald-400' : 'text-foreground')}>{m.value}</p>
              <p className="text-[9px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tags + scheduled */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {c.tags.slice(0, 3).map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] bg-muted border border-border text-muted-foreground">{t}</span>
          ))}
        </div>
        {c.scheduled_at && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 shrink-0">
            <Clock className="w-2.5 h-2.5" /> {new Date(c.scheduled_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Template card ────────────────────────────────────────────────────────────
function TemplateCard({ t, onUse, onCopy }: { t: Template; onUse: (t: Template) => void; onCopy: (t: Template) => void }) {
  const ch = CHANNEL_CONFIG[t.channel];
  const ChIcon = ch.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card hover:border-primary/30 transition-all p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn('w-6 h-6 rounded-lg border flex items-center justify-center shrink-0', ch.bg)}>
            <ChIcon className={cn('w-3 h-3', ch.color)} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
            <p className="text-[9px] text-muted-foreground capitalize">{t.category.replace('_', ' ')} · {t.usage_count} uses</p>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onCopy(t)} title="Copy content">
            <Copy className="w-3 h-3" />
          </Button>
          <Button size="sm" className="h-6 px-2 text-[10px] gap-1" onClick={() => onUse(t)}>
            <Plus className="w-2.5 h-2.5" /> Use
          </Button>
        </div>
      </div>
      <button
        className="text-[10px] text-muted-foreground line-clamp-2 text-left w-full hover:text-foreground transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? t.content : t.content.slice(0, 120) + (t.content.length > 120 ? '…' : '')}
      </button>
      {t.variables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.variables.map(v => (
            <span key={v} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-primary/10 text-primary border border-primary/20">
              {`{{${v}}}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Audience selector ────────────────────────────────────────────────────────
const AUDIENCE_OPTIONS = [
  { value: 'all_leads',         label: 'All Leads', est: '—' },
  { value: 'hot_leads',         label: 'Hot Leads', est: '—' },
  { value: 'cold_leads',        label: 'Cold Leads (>30 days)', est: '—' },
  { value: 'recent_customers',  label: 'Recent Customers (90 days)', est: '—' },
  { value: 'interested_suv',    label: 'Interested in SUVs', est: '—' },
  { value: 'interested_sedan',  label: 'Interested in Sedans', est: '—' },
  { value: 'budget_under_50l',  label: 'Budget under 50 Lakh', est: '—' },
  { value: 'budget_50l_1cr',    label: 'Budget 50L – 1 Crore', est: '—' },
  { value: 'budget_above_1cr',  label: 'Budget above 1 Crore', est: '—' },
  { value: 'city_lahore',       label: 'City: Lahore', est: '—' },
  { value: 'city_karachi',      label: 'City: Karachi', est: '—' },
  { value: 'city_islamabad',    label: 'City: Islamabad', est: '—' },
];

// ─── Campaign form ────────────────────────────────────────────────────────────
const BLANK_CAMPAIGN: Omit<Campaign, 'id' | 'created_at' | 'sent_count' | 'opened_count' | 'clicked_count' | 'converted_count'> = {
  name: '', status: 'draft', channel: 'whatsapp', audience: 'all_leads',
  audience_count: 0, message_template: '', tags: [],
};

function CampaignForm({ initial, templates, onSave, onCancel }: {
  initial?: Partial<Campaign>;
  templates: Template[];
  onSave: (data: Partial<Campaign>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({ ...BLANK_CAMPAIGN, ...initial });
  const [tagInput, setTagInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  const preview = useMemo(() => {
    return form.message_template
      .replace(/{{[^}]+}}/g, match => `[${match.slice(2, -2).toUpperCase()}]`);
  }, [form.message_template]);

  return (
    <div className="space-y-4">
      {/* Name + channel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Campaign Name *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Eid Sale 2026" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Channel *</Label>
          <Select value={form.channel} onValueChange={v => set('channel', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  <span className="flex items-center gap-2">
                    <v.icon className={cn('w-3.5 h-3.5', v.color)} /> {v.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Audience + schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Target Audience *</Label>
          <Select value={form.audience} onValueChange={v => set('audience', v)}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map(a => (
                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Schedule (optional)</Label>
          <Input type="datetime-local" value={form.scheduled_at ?? ''} onChange={e => set('scheduled_at', e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      {/* Template picker */}
      {templates.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Load from template</Label>
          <Select onValueChange={v => {
            const t = templates.find(t => t.id === v);
            if (t) set('message_template', t.content);
          }}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select a template…" /></SelectTrigger>
            <SelectContent>
              {templates.filter(t => t.channel === form.channel).map(t => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Message */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Message *</Label>
          <button onClick={() => setPreviewMode(v => !v)} className="text-[10px] text-primary hover:underline">
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>
        {previewMode ? (
          <div className="min-h-[120px] p-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground whitespace-pre-wrap font-mono">
            {preview || <span className="text-muted-foreground">No message content yet…</span>}
          </div>
        ) : (
          <Textarea
            value={form.message_template}
            onChange={e => set('message_template', e.target.value)}
            placeholder="Write your message. Use {{variable}} for dynamic content."
            className="min-h-[120px] text-xs font-mono"
          />
        )}
        <p className="text-[10px] text-muted-foreground">{form.message_template.length} chars · Use {'{{variable}}'} for personalisation</p>
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <Label className="text-xs">Tags</Label>
        <div className="flex gap-2">
          <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag…" className="h-8 text-xs flex-1" />
          <Button size="sm" variant="outline" onClick={addTag} className="h-8 text-xs">Add</Button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {form.tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-muted border border-border text-muted-foreground">
                {t}
                <button onClick={() => set('tags', form.tags.filter(x => x !== t))} className="hover:text-destructive">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} className="text-xs">Cancel</Button>
        <Button variant="outline" onClick={() => onSave({ ...form, status: 'draft' })} className="text-xs gap-1.5">
          <Edit3 className="w-3 h-3" /> Save Draft
        </Button>
        {form.scheduled_at ? (
          <Button onClick={() => onSave({ ...form, status: 'scheduled' })} className="text-xs gap-1.5">
            <Clock className="w-3 h-3" /> Schedule
          </Button>
        ) : (
          <Button onClick={() => onSave({ ...form, status: 'active' })} className="text-xs gap-1.5">
            <Send className="w-3 h-3" /> Launch Now
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

// ─── AI Blast Tab ─────────────────────────────────────────────────────────────
const BLAST_TONES = ['Professional', 'Friendly', 'Urgent', 'Festive', 'Follow-up', 'VIP Exclusive'];
const BLAST_TARGETS = ['All Leads', 'Hot Leads Only', 'Cold Leads (re-engage)', 'Recent Inquiries', 'Custom Segment'];
const BLAST_CHANNELS = ['WhatsApp', 'SMS', 'Email', 'WhatsApp + SMS'];

function AIBlastTab() {
  const [tone, setTone] = useState('Professional');
  const [target, setTarget] = useState('Hot Leads Only');
  const [channel, setChannel] = useState('WhatsApp');
  const [offer, setOffer] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [generatedMsg, setGeneratedMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = () => {
    if (loading) { abortRef.current?.abort(); setLoading(false); return; }
    setGeneratedMsg(''); setLoading(true); setCopied(false);
    abortRef.current = new AbortController();
    const biz = getSettings().bizName || 'Wulfrayn\'s DB';
    const prompt = `You are a marketing copywriter for ${biz}, a premium used car dealership in Pakistan.

Write a ${tone.toLowerCase()} ${channel} marketing message targeting: ${target}.
${vehicle ? `Featured vehicle/offer: ${vehicle}` : ''}
${offer ? `Special offer/promotion: ${offer}` : ''}

Requirements:
- Max 200 words for WhatsApp/SMS, 300 for Email
- Include a compelling call-to-action (WhatsApp link or phone call)
- Use Pakistani market context (PKR pricing, local references)
- Add relevant emoji for WhatsApp messages
- End with business name and contact prompt

Write ONLY the message text, no explanation.`;

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: 'You are an expert automotive marketing copywriter specialising in Pakistani used car dealerships. Write concise, compelling marketing messages.',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      onChunk: c => setGeneratedMsg(p => p + c),
      onComplete: () => setLoading(false),
      onError: e => { setLoading(false); toast.error(e.message.includes('429') ? 'Rate limit — retry in a moment' : 'AI generation failed'); },
      signal: abortRef.current.signal,
    });
  };

  const copyMsg = () => {
    if (!generatedMsg) return;
    navigator.clipboard.writeText(generatedMsg);
    setCopied(true); toast.success('Message copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappShare = () => {
    if (!generatedMsg) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(generatedMsg)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <Bot className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">AI Marketing Message Generator</p>
          <p className="text-xs text-muted-foreground mt-0.5">Generate personalised WhatsApp blasts, SMS campaigns, and email copy tailored to your leads — powered by Gemini AI.</p>
        </div>
        <Badge className="bg-purple-400/15 text-purple-400 border-purple-400/25 text-[10px] shrink-0 self-start">Gemini 2.5 Flash</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Config panel */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Message Configuration</p>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Channel</Label>
            <div className="flex flex-wrap gap-1.5">
              {BLAST_CHANNELS.map(c => (
                <button key={c} onClick={() => setChannel(c)}
                  className={cn('px-3 py-1 rounded-lg border text-xs font-medium transition-colors',
                    channel === c ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tone</Label>
            <div className="flex flex-wrap gap-1.5">
              {BLAST_TONES.map(t => (
                <button key={t} onClick={() => setTone(t)}
                  className={cn('px-3 py-1 rounded-lg border text-xs font-medium transition-colors',
                    tone === t ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Audience</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger className="h-8 text-xs border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{BLAST_TARGETS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Featured Vehicle (optional)</Label>
            <Input value={vehicle} onChange={e => setVehicle(e.target.value)}
              placeholder="e.g. Toyota Aqua 2017 PKR 2.8M" className="h-8 text-xs border-border" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Special Offer / Promotion (optional)</Label>
            <Input value={offer} onChange={e => setOffer(e.target.value)}
              placeholder="e.g. Eid discount, free inspection, 0% finance" className="h-8 text-xs border-border" />
          </div>

          <Button onClick={generate} className="w-full gap-2" size="sm">
            {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Stop Generation</> : <><Sparkles className="w-3.5 h-3.5" />Generate Message</>}
          </Button>
        </div>

        {/* Output panel */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Generated Message</p>
          <div className="relative min-h-[280px] bg-muted/20 border border-border rounded-xl p-4">
            {!generatedMsg && !loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <Sparkles className="w-10 h-10 text-muted-foreground/20 mb-3" />
                <p className="text-xs text-muted-foreground">Configure your message settings and click Generate to create AI-powered marketing copy</p>
              </div>
            )}
            {loading && !generatedMsg && (
              <div className="space-y-2">
                {[1,2,3,4].map(i => <div key={i} className="h-3 bg-muted/50 rounded animate-pulse" style={{ width: `${70 + i * 7}%` }} />)}
              </div>
            )}
            {generatedMsg && (
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {generatedMsg}
                {loading && <span className="inline-block w-0.5 h-3 bg-primary animate-pulse ml-0.5 align-middle" />}
              </p>
            )}
          </div>
          {generatedMsg && !loading && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyMsg} className="flex-1 h-8 text-xs gap-1.5 border-border">
                {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
              </Button>
              <Button variant="outline" size="sm" onClick={whatsappShare} className="flex-1 h-8 text-xs gap-1.5 border-green-400/30 text-green-400 hover:bg-green-400/10">
                <MessageSquare className="w-3.5 h-3.5" />Send via WhatsApp
              </Button>
              <Button variant="ghost" size="sm" onClick={generate} className="h-8 w-8 p-0 border-border border">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [tab, setTab] = useState('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>(DEFAULT_AUTOMATIONS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | CampaignStatus>('all');
  const [filterChannel, setFilterChannel] = useState<'all' | CampaignChannel>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [tplSearch, setTplSearch] = useState('');
  const [tplChannel, setTplChannel] = useState<'all' | CampaignChannel>('all');
  const [customTplOpen, setCustomTplOpen] = useState(false);
  const [newTpl, setNewTpl] = useState({ name: '', category: 'promotion' as TemplateCategory, channel: 'whatsapp' as CampaignChannel, content: '' });

  // ── Load from Supabase (graceful fallback to local state) ──────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: cData } = await supabase
        .from('rpm_marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (Array.isArray(cData) && cData.length > 0) {
        setCampaigns(cData as Campaign[]);
      }

      const { data: tData } = await supabase
        .from('rpm_marketing_templates')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(100);

      const dbTemplates = Array.isArray(tData) ? (tData as Template[]) : [];
      // Merge built-in templates (with deterministic IDs) + DB templates
      const builtIn: Template[] = BUILT_IN_TEMPLATES.map((t, i) => ({
        ...t, id: `builtin-${i}`, created_at: new Date().toISOString(), usage_count: 0,
      }));
      setTemplates([...builtIn, ...dbTemplates.filter(d => !d.id.startsWith('builtin-'))]);
    } catch {
      // Supabase table may not exist yet — use built-in templates only
      const builtIn: Template[] = BUILT_IN_TEMPLATES.map((t, i) => ({
        ...t, id: `builtin-${i}`, created_at: new Date().toISOString(), usage_count: 0,
      }));
      setTemplates(builtIn);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalSent: campaigns.reduce((s, c) => s + c.sent_count, 0),
    avgOpenRate: campaigns.filter(c => c.sent_count > 0).length > 0
      ? Math.round(campaigns.filter(c => c.sent_count > 0).reduce((s, c) => s + (c.opened_count / c.sent_count) * 100, 0) / campaigns.filter(c => c.sent_count > 0).length)
      : 0,
    totalConverted: campaigns.reduce((s, c) => s + c.converted_count, 0),
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
  }), [campaigns]);

  // ── Filtered campaigns ─────────────────────────────────────────────────────
  const filtered = useMemo(() => campaigns.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterChannel !== 'all' && c.channel !== filterChannel) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.audience.toLowerCase().includes(q) || c.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  }), [campaigns, filterStatus, filterChannel, search]);

  // ── Filtered templates ─────────────────────────────────────────────────────
  const filteredTpl = useMemo(() => templates.filter(t => {
    if (tplChannel !== 'all' && t.channel !== tplChannel) return false;
    if (tplSearch) {
      const q = tplSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.category.includes(q);
    }
    return true;
  }), [templates, tplChannel, tplSearch]);

  // ── Save campaign ──────────────────────────────────────────────────────────
  const saveCampaign = async (data: Partial<Campaign>) => {
    if (!data.name?.trim()) { toast.error('Campaign name is required'); return; }
    if (!data.message_template?.trim()) { toast.error('Message content is required'); return; }

    const now = new Date().toISOString();
    if (editTarget) {
      const updated = { ...editTarget, ...data };
      try {
        await supabase.from('rpm_marketing_campaigns').upsert({ ...updated, updated_at: now });
      } catch { /* table may not exist */ }
      setCampaigns(p => p.map(c => c.id === editTarget.id ? updated : c));
      toast.success('Campaign updated');
    } else {
      const newC: Campaign = {
        ...BLANK_CAMPAIGN,
        ...data,
        id: crypto.randomUUID(),
        created_at: now,
        sent_count: 0,
        opened_count: 0,
        clicked_count: 0,
        converted_count: 0,
      } as Campaign;
      try {
        await supabase.from('rpm_marketing_campaigns').insert(newC);
      } catch { /* table may not exist */ }
      setCampaigns(p => [newC, ...p]);
      toast.success(data.status === 'scheduled' ? '📅 Campaign scheduled!' : data.status === 'active' ? '🚀 Campaign launched!' : '✅ Draft saved');
    }
    setFormOpen(false);
    setEditTarget(null);
  };

  // ── Delete campaign ────────────────────────────────────────────────────────
  const deleteCampaign = async (id: string) => {
    try { await supabase.from('rpm_marketing_campaigns').delete().eq('id', id); } catch { /* ok */ }
    setCampaigns(p => p.filter(c => c.id !== id));
    setDeleteTarget(null);
    toast.success('Campaign deleted');
  };

  // ── Toggle status ──────────────────────────────────────────────────────────
  const toggleStatus = async (id: string, status: CampaignStatus) => {
    try { await supabase.from('rpm_marketing_campaigns').update({ status }).eq('id', id); } catch { /* ok */ }
    setCampaigns(p => p.map(c => c.id === id ? { ...c, status } : c));
    toast.success(`Campaign ${status}`);
  };

  // ── Use template → open campaign form ────────────────────────────────────
  const useTemplate = (t: Template) => {
    setEditTarget(null);
    setFormOpen(true);
    setTimeout(() => {
      setCampaigns(p => p); // trigger re-render, form picks up template via initial
    }, 50);
    // Directly open form with template content pre-filled via editTarget trick
    setEditTarget({ id: '', name: '', status: 'draft', channel: t.channel, audience: 'all_leads', audience_count: 0, message_template: t.content, tags: [], sent_count: 0, opened_count: 0, clicked_count: 0, converted_count: 0, created_at: '' });
    setFormOpen(true);
  };

  // ── Copy template ─────────────────────────────────────────────────────────
  const copyTemplate = (t: Template) => {
    navigator.clipboard.writeText(t.content);
    toast.success('Template copied to clipboard!');
  };

  // ── Save custom template ──────────────────────────────────────────────────
  const saveCustomTemplate = async () => {
    if (!newTpl.name.trim() || !newTpl.content.trim()) { toast.error('Name and content required'); return; }
    const vars = [...newTpl.content.matchAll(/{{(\w+)}}/g)].map(m => m[1]);
    const t: Template = { ...newTpl, id: crypto.randomUUID(), variables: vars, usage_count: 0, created_at: new Date().toISOString() };
    try { await supabase.from('rpm_marketing_templates').insert(t); } catch { /* ok */ }
    setTemplates(p => [t, ...p]);
    setCustomTplOpen(false);
    setNewTpl({ name: '', category: 'promotion', channel: 'whatsapp', content: '' });
    toast.success('Template saved!');
  };

  // ── Toggle automation ─────────────────────────────────────────────────────
  const toggleAutomation = (id: string) => {
    setAutomations(p => p.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
    const a = automations.find(x => x.id === id);
    toast.success(`Automation "${a?.name}" ${a?.enabled ? 'disabled' : 'enabled'}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full min-h-screen bg-background">
        {/* ── Page header ── */}
        <div className="border-b border-border bg-card/60 backdrop-blur-xl px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-black text-foreground">Marketing Command</h1>
                <p className="text-xs text-muted-foreground">{stats.active} active · {stats.scheduled} scheduled · {stats.totalSent.toLocaleString()} messages sent</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={load} className="h-8 w-8 p-0 border-border">
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              </Button>
              <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                <PlusCircle className="w-3.5 h-3.5" /> New Campaign
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-6 space-y-6">
          {/* ── Stats row ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Campaigns" value={stats.total} sub="total created" />
            <MetricCard label="Active" value={stats.active} sub="running now" color="text-emerald-400" />
            <MetricCard label="Scheduled" value={stats.scheduled} sub="queued" color="text-blue-400" />
            <MetricCard label="Total Sent" value={stats.totalSent.toLocaleString()} sub="all time" />
            <MetricCard label="Avg Open Rate" value={`${stats.avgOpenRate}%`} sub="across campaigns" color={stats.avgOpenRate > 40 ? 'text-emerald-400' : 'text-foreground'} />
            <MetricCard label="Conversions" value={stats.totalConverted} sub="leads converted" color="text-primary" />
          </div>

          {/* ── Tabs ── */}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="h-9 gap-0.5 bg-muted/60">
              <TabsTrigger value="campaigns" className="text-xs h-7 gap-1.5"><Megaphone className="w-3 h-3" /> Campaigns</TabsTrigger>
              <TabsTrigger value="templates" className="text-xs h-7 gap-1.5"><FileText className="w-3 h-3" /> Templates</TabsTrigger>
              <TabsTrigger value="automations" className="text-xs h-7 gap-1.5"><Zap className="w-3 h-3" /> Automations</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs h-7 gap-1.5"><Activity className="w-3 h-3" /> Analytics</TabsTrigger>
              <TabsTrigger value="aiblast" className="text-xs h-7 gap-1.5"><Bot className="w-3 h-3" /> AI Blast</TabsTrigger>
            </TabsList>

            {/* ── CAMPAIGNS tab ── */}
            <TabsContent value="campaigns" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search campaigns…" className="h-8 pl-8 text-xs" />
                </div>
                <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
                  <SelectTrigger className="h-8 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterChannel} onValueChange={v => setFilterChannel(v as any)}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading campaigns…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center">
                    <Megaphone className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">No campaigns yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Create your first campaign to start reaching customers across WhatsApp, SMS, Email, and social channels.</p>
                  <Button size="sm" className="gap-1.5 text-xs mt-2" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                    <PlusCircle className="w-3.5 h-3.5" /> Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filtered.map(c => (
                    <CampaignCard
                      key={c.id} c={c}
                      onEdit={c => { setEditTarget(c); setFormOpen(true); }}
                      onDelete={id => setDeleteTarget(id)}
                      onToggle={toggleStatus}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── TEMPLATES tab ── */}
            <TabsContent value="templates" className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2 items-center flex-1">
                  <div className="relative min-w-[160px] flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input value={tplSearch} onChange={e => setTplSearch(e.target.value)} placeholder="Search templates…" className="h-8 pl-8 text-xs" />
                  </div>
                  <Select value={tplChannel} onValueChange={v => setTplChannel(v as any)}>
                    <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Channel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Channels</SelectItem>
                      {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setCustomTplOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Custom Template
                </Button>
              </div>

              {filteredTpl.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                  <FileText className="w-8 h-8 opacity-30" />
                  <p className="text-xs">No templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredTpl.map(t => (
                    <TemplateCard key={t.id} t={t} onUse={useTemplate} onCopy={copyTemplate} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ── AUTOMATIONS tab ── */}
            <TabsContent value="automations" className="mt-4 space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
                <Zap className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Smart Automation Rules</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Enable triggers to automatically send messages when events happen. Connect to your CRM and inventory for live automation.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {automations.map(a => {
                  const ch = CHANNEL_CONFIG[a.channel];
                  const ChIcon = ch.icon;
                  return (
                    <div key={a.id} className={cn(
                      'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
                      a.enabled ? 'bg-card border-border' : 'bg-muted/20 border-border/40 opacity-60'
                    )}>
                      <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center shrink-0', ch.bg)}>
                        <ChIcon className={cn('w-4 h-4', ch.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{a.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          <span className="text-blue-400">Trigger:</span> {a.trigger} →
                          <span className="text-emerald-400 ml-1">Action:</span> {a.action}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.runs > 0 && (
                          <span className="text-[10px] text-muted-foreground">{a.runs} runs</span>
                        )}
                        <button
                          onClick={() => toggleAutomation(a.id)}
                          className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all', a.enabled
                            ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                            : 'bg-muted border-border text-muted-foreground'
                          )}
                        >
                          {a.enabled ? <ToggleRight className="w-3 h-3" /> : <ToggleLeft className="w-3 h-3" />}
                          {a.enabled ? 'On' : 'Off'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-dashed border-border p-4 flex flex-col items-center gap-2 text-center">
                <Plus className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Custom automation rules coming soon — connect Zapier, Make, or your own webhook</p>
              </div>
            </TabsContent>

            {/* ── ANALYTICS tab ── */}
            <TabsContent value="analytics" className="mt-4 space-y-4">
              {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
                  <Activity className="w-10 h-10 text-muted-foreground opacity-30" />
                  <p className="text-sm text-muted-foreground">No campaign data yet — launch a campaign to see analytics</p>
                </div>
              ) : (
                <>
                  {/* Per-channel breakdown */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performance by Channel</p>
                    <div className="space-y-1.5">
                      {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                        const ch = key as CampaignChannel;
                        const cList = campaigns.filter(c => c.channel === ch);
                        if (cList.length === 0) return null;
                        const sent = cList.reduce((s, c) => s + c.sent_count, 0);
                        const opened = cList.reduce((s, c) => s + c.opened_count, 0);
                        const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                        const ChIcon = cfg.icon;
                        return (
                          <div key={ch} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                            <div className={cn('w-8 h-8 rounded-xl border flex items-center justify-center shrink-0', cfg.bg)}>
                              <ChIcon className={cn('w-4 h-4', cfg.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-semibold text-foreground">{cfg.label}</p>
                                <p className="text-xs text-muted-foreground">{cList.length} campaign{cList.length !== 1 ? 's' : ''} · {sent.toLocaleString()} sent</p>
                              </div>
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(openRate, 100)}%` }} />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{openRate}% open rate</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Top campaigns */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Top Performing Campaigns</p>
                    {campaigns
                      .filter(c => c.sent_count > 0)
                      .sort((a, b) => (b.converted_count / Math.max(b.sent_count, 1)) - (a.converted_count / Math.max(a.sent_count, 1)))
                      .slice(0, 5)
                      .map(c => {
                        const ch = CHANNEL_CONFIG[c.channel];
                        const convRate = c.sent_count > 0 ? ((c.converted_count / c.sent_count) * 100).toFixed(1) : '0';
                        const ChIcon = ch.icon;
                        return (
                          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                            <ChIcon className={cn('w-4 h-4 shrink-0', ch.color)} />
                            <p className="flex-1 min-w-0 text-xs font-medium text-foreground truncate">{c.name}</p>
                            <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                              <span>{c.sent_count.toLocaleString()} sent</span>
                              <span className="text-emerald-400 font-semibold">{convRate}% conv.</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </TabsContent>

            {/* ── AI Blast Tab ── */}
            <TabsContent value="aiblast" className="mt-4 space-y-4">
              <AIBlastTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── Campaign form dialog ── */}
      <Dialog open={formOpen} onOpenChange={v => { setFormOpen(v); if (!v) setEditTarget(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editTarget?.id ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          </DialogHeader>
          <CampaignForm
            initial={editTarget ?? undefined}
            templates={templates}
            onSave={saveCampaign}
            onCancel={() => { setFormOpen(false); setEditTarget(null); }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Custom template dialog ── */}
      <Dialog open={customTplOpen} onOpenChange={setCustomTplOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Create Custom Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={newTpl.name} onChange={e => setNewTpl(p => ({ ...p, name: e.target.value }))} placeholder="Template name" className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Channel</Label>
                <Select value={newTpl.channel} onValueChange={v => setNewTpl(p => ({ ...p, channel: v as CampaignChannel }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select value={newTpl.category} onValueChange={v => setNewTpl(p => ({ ...p, category: v as TemplateCategory }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['promotion','follow_up','announcement','inventory','seasonal','event'] as TemplateCategory[]).map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Content * — use {'{{variable}}'} for dynamic fields</Label>
              <Textarea value={newTpl.content} onChange={e => setNewTpl(p => ({ ...p, content: e.target.value }))} placeholder="Write your template…" className="min-h-[120px] text-xs font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomTplOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={saveCustomTemplate} className="text-xs gap-1.5"><Plus className="w-3 h-3" /> Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Delete Campaign?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. All campaign data and metrics will be permanently deleted.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} className="text-xs">Cancel</Button>
            <Button variant="destructive" onClick={() => deleteTarget && deleteCampaign(deleteTarget)} className="text-xs gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
