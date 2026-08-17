import React, { useEffect, useState, useCallback } from 'react';
import {
  Share2, Plus, Trash2, Bot, Copy, Check,
  Instagram, Globe, Linkedin, MessageSquare, ExternalLink,
  Hash, Clock, FileText, Search, BookOpen,
  RefreshCw, Target, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import AppLayout from '@/components/layouts/AppLayout';
import {
  fetchSocialPosts, saveSocialPost, deleteSocialPost,
  type SocialPost, type SocialPlatform,
} from '@/lib/rpm-api';
import { streamLLMQueued } from '@/lib/ai-client';
import { fetchVehicles } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';


const PLATFORM_CONFIG: Record<SocialPlatform, { label: string; color: string; icon: React.ElementType; url?: string; shareUrl?: (text: string) => string }> = {
  instagram:  { label: 'Instagram',  color: 'text-pink-400 bg-pink-400/10 border-pink-400/20',       icon: Instagram,    url: 'https://www.instagram.com/', shareUrl: () => 'https://www.instagram.com/' },
  facebook:   { label: 'Facebook',   color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',       icon: MessageSquare, url: 'https://www.facebook.com/',  shareUrl: (t) => `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(t)}` },
  linkedin:   { label: 'LinkedIn',   color: 'text-sky-400 bg-sky-400/10 border-sky-400/20',          icon: Linkedin,     url: 'https://www.linkedin.com/',   shareUrl: (t) => `https://www.linkedin.com/sharing/share-offsite/?summary=${encodeURIComponent(t)}` },
  whatsapp:   { label: 'WhatsApp',   color: 'text-green-400 bg-green-400/10 border-green-400/20',    icon: MessageSquare, url: 'https://wa.me/',             shareUrl: (t) => `https://wa.me/?text=${encodeURIComponent(t)}` },
  website:    { label: 'Website',    color: 'text-primary bg-primary/10 border-primary/20',           icon: Globe,        url: 'https://www.google.com/' },
  olx:        { label: 'OLX',        color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: ExternalLink, url: 'https://www.olx.com.pk/cars/',    shareUrl: () => 'https://www.olx.com.pk/cars/' },
  pakwheels:  { label: 'PakWheels',  color: 'text-red-400 bg-red-400/10 border-red-400/20',          icon: ExternalLink, url: 'https://www.pakwheels.com/used-cars/search/-/', shareUrl: () => 'https://www.pakwheels.com/used-cars/search/-/' },
};

const CONTENT_TYPES = [
  { val: 'instagram_caption', label: 'Instagram Caption' },
  { val: 'facebook_post',     label: 'Facebook Post' },
  { val: 'linkedin_post',     label: 'LinkedIn Post' },
  { val: 'whatsapp_status',   label: 'WhatsApp Status' },
  { val: 'seo_description',   label: 'SEO Description' },
  { val: 'website_listing',   label: 'Website Listing' },
  { val: 'vehicle_description', label: 'Vehicle Description' },
];



// Hashtag Library Tab
const HASHTAG_SETS = [
  { category: 'General Cars Pakistan', tags: ['#CarsOfPakistan', '#PakWheels', '#CarSalePakistan', '#UsedCars', '#CarDealer', '#AutoPakistan', '#CarMarket', '#VehicleForSale', '#CarBuyers', '#MotorsPakistan'] },
  { category: 'JDM / Japanese Imports', tags: ['#JDMCars', '#JapaneseImport', '#JDMPakistan', '#ToyotaPakistan', '#HondaPakistan', '#NissanPakistan', '#MazdaPakistan', '#JDMLife', '#ImportedCar', '#JapanCars'] },
  { category: 'Luxury & Premium', tags: ['#LuxuryCars', '#BMWPakistan', '#MercedesPakistan', '#AudiPakistan', '#LexusPakistan', '#PremiumCars', '#LuxuryAutos', '#PrestigeCars', '#HighEndCars', '#BMWLovers'] },
  { category: 'SUV & 4x4', tags: ['#SUVPakistan', '#4x4Pakistan', '#Fortuner', '#Prado', '#LandCruiser', '#Hilux', '#OffRoadPakistan', '#SUVLife', '#FourWheelDrive', '#PajerotPakistan'] },
  { category: 'Hybrids & EVs', tags: ['#HybridCars', '#PriusPakistan', '#HybridPakistan', '#EVCars', '#ElectricVehicle', '#FuelEfficient', '#GreenCar', '#EcoFriendly', '#HybridLife', '#LowEmissions'] },
  { category: 'Karachi Dealers', tags: ['#KarachiCars', '#KarachiDealer', '#CarsinKarachi', '#KarachiMotors', '#SindhCars', '#KarachiAutos', '#KarachiSale', '#KarachiWheels', '#KarachiMarket', '#KHI'] },
  { category: 'Lahore Dealers', tags: ['#LahoreCars', '#LahoreDealer', '#CarsinLahore', '#LahoreMotors', '#PunjabCars', '#LahoreAutos', '#LahoreWheels', '#PunjabWheels', '#LHR', '#LahoreMarket'] },
  { category: 'Sedan Specific', tags: ['#ToyotaCorolla', '#HondaCivic', '#HondaCity', '#ToyotaCamry', '#SuzukiAltoPakistan', '#BYDPakistan', '#SuzukiWagon', '#DaihatsuMira', '#Cultus', '#AltoVXL'] },
];

const CAPTION_TEMPLATES = [
  { title: 'Single Car Listing', platform: 'Instagram', template: '🚗 *{year} {make} {model}*\n\n✅ Mileage: {mileage} km\n✅ Transmission: {transmission}\n✅ Fuel: {fuel}\n✅ Color: {color}\n\n💰 Price: {price}\n\n📍 {location}\n📞 {phone}\n\n{hashtags}' },
  { title: 'Price Drop Alert', platform: 'Facebook', template: "🔥 PRICE DROP ALERT!\n\n{year} {make} {model} - Now at {price} (was {old_price})\n\n🎯 Don't miss this deal! Limited time only.\n\nCall/WhatsApp: {phone}\n📍 {location}\n\n{hashtags}" },
  { title: 'Stock Arrival', platform: 'WhatsApp', template: '🎉 FRESH STOCK ARRIVED!\n\n*{make} {model} {year}*\n\n🔹 {feature1}\n🔹 {feature2}\n🔹 {feature3}\n\nPrice: {price}\nContact: {phone}\n\nFirst come, first served!' },
  { title: 'Monthly Sale', platform: 'Instagram', template: '📅 {month} SALE IS LIVE!\n\nBrowse {count}+ premium vehicles in stock.\n\n⭐ Verified quality\n⭐ Transparent pricing\n⭐ Finance available\n\n📞 Call: {phone}\n🌐 {website}\n\n{hashtags}' },
  { title: 'JDM Import Promo', platform: 'Facebook', template: '🇯🇵 FRESH JDM IMPORT!\n\n{year} {make} {model}\n\n✅ Japanese Auction Grade: {grade}\n✅ Low Mileage: {mileage} km\n✅ First Owner / No Accident\n\n💴 Japan Purchase + Import: Done\n💰 Final Price: {price}\n\nDM or call: {phone}' },
  { title: 'Customer Testimonial', platform: 'Instagram', template: '⭐ HAPPY CUSTOMER!\n\n"{testimonial}"\n\n- {customer_name}, {city}\n\nJust purchased: {year} {make} {model}\n\n📞 {phone}\n💼 {business_name}\n\n#CustomerSatisfaction #TrustedDealer {hashtags}' },
];

const BEST_POST_TIMES = [
  { platform: 'Instagram', times: ['7:00-9:00 AM', '12:00-2:00 PM', '7:00-9:00 PM'], best_days: 'Wed, Thu, Fri', notes: 'Evening posts get most engagement; Stories perform best 9-11 AM' },
  { platform: 'Facebook', times: ['9:00-11:00 AM', '1:00-3:00 PM', '6:00-8:00 PM'], best_days: 'Tue, Wed, Thu', notes: 'Weekend mornings good for car listings; avoid late night' },
  { platform: 'WhatsApp Status', times: ['8:00-10:00 AM', '7:00-9:00 PM'], best_days: 'Daily', notes: 'Status visible for 24 hrs - post once in morning, once evening' },
  { platform: 'LinkedIn', times: ['7:00-9:00 AM', '12:00 PM', '5:00-6:00 PM'], best_days: 'Tue, Wed, Thu', notes: 'B2B focused - best for fleet sales and corporate vehicles' },
  { platform: 'OLX', times: ['10:00 AM-12:00 PM', '4:00-6:00 PM'], best_days: 'Mon, Tue, Wed', notes: 'Refresh/bump listings every 3-5 days for max visibility' },
];

const ENGAGEMENT_TIPS = [
  { tip: 'Always include price', reason: 'Posts without price get 60% fewer inquiries - buyers hate "price on call"', impact: 'High' },
  { tip: 'Use 5-10 relevant hashtags', reason: 'More than 10 looks spammy; fewer than 5 reduces discoverability', impact: 'High' },
  { tip: 'First photo = exterior front-angle', reason: 'Clean 3/4 front shot is proven to get 40% more clicks than other angles', impact: 'High' },
  { tip: 'Video walkaround in Stories', reason: 'Reels and Stories with video generate 3× more engagement than static posts', impact: 'High' },
  { tip: 'Respond within 1 hour', reason: 'Response rate in first hour = 7× better chance of conversion', impact: 'Critical' },
  { tip: 'Show mileage prominently', reason: 'Mileage is top buying factor - hiding it reduces trust', impact: 'Medium' },
  { tip: 'Tag location in every post', reason: 'Local searchability increases by 25% with location tags', impact: 'Medium' },
  { tip: 'Post at peak hours', reason: 'Timing can double organic reach for free', impact: 'Medium' },
];

function HashtagLibraryTab() {
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const filtered = HASHTAG_SETS.filter(s =>
    !search || s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );
  const copyAll = (tags: string[], key: string) => {
    navigator.clipboard.writeText(tags.join(' '));
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hashtags…"
          className="w-full pl-9 pr-4 h-9 text-sm bg-muted/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((set, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-primary/10 px-4 py-2.5 flex items-center justify-between">
              <p className="font-bold text-sm text-primary flex items-center gap-2"><Hash className="w-3.5 h-3.5" />{set.category}</p>
              <button onClick={() => copyAll(set.tags, set.category)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                {copied === set.category ? <><Check className="w-3 h-3 text-green-400" />Copied!</> : <><Copy className="w-3 h-3" />Copy All</>}
              </button>
            </div>
            <div className="p-3 flex flex-wrap gap-1.5">
              {set.tags.map((tag, j) => (
                <button key={j} onClick={() => { navigator.clipboard.writeText(tag); setCopied(tag); setTimeout(() => setCopied(null), 1500); }}
                  className={`text-[11px] px-2 py-1 rounded-full border transition-colors ${copied === tag ? 'bg-green-400/20 border-green-400/40 text-green-400' : 'bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-primary/50'}`}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CaptionTemplatesTab() {
  const [selected, setSelected] = useState<typeof CAPTION_TEMPLATES[0] | null>(null);
  const [customised, setCustomised] = useState('');
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(customised); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CAPTION_TEMPLATES.map((t, i) => (
          <button key={i} onClick={() => { setSelected(t); setCustomised(t.template); }}
            className={`text-left border rounded-xl p-4 transition-colors ${selected?.title === t.title ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-border/80'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm text-foreground">{t.title}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{t.platform}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{t.template.substring(0, 80)}…</p>
          </button>
        ))}
      </div>
      {selected && (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
            <p className="font-bold text-sm text-foreground">{selected.title} - Edit Template</p>
            <button onClick={copy}
              className={`flex items-center gap-1 text-xs transition-colors ${copied ? 'text-green-400' : 'text-muted-foreground hover:text-foreground'}`}>
              {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </button>
          </div>
          <div className="p-4">
            <textarea value={customised} onChange={e => setCustomised(e.target.value)} rows={10}
              className="w-full text-sm bg-muted/30 border border-border rounded-lg p-3 text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
            <p className="text-[11px] text-muted-foreground mt-2">Replace {'{placeholders}'} with your actual data before posting.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PostTimingTab() {
  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p className="font-bold text-sm text-primary mb-1">⏰ Best Posting Times Guide</p>
        <p className="text-xs text-muted-foreground">Timings are based on Pakistan (PKT, UTC+5) peak social media activity. Your audience insights may vary.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BEST_POST_TIMES.map((p, i) => (
          <div key={i} className="border border-border rounded-xl overflow-hidden">
            <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between">
              <p className="font-bold text-sm text-foreground">{p.platform}</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{p.best_days}</span>
            </div>
            <div className="p-4 space-y-2 text-xs">
              <div className="flex flex-wrap gap-1.5">
                {p.times.map((t, j) => (
                  <span key={j} className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/5 border border-primary/20 text-primary">
                    <Clock className="w-3 h-3" />{t}
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground">{p.notes}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-muted/30 px-4 py-2.5">
          <p className="font-bold text-sm text-foreground flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Engagement Tips</p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {ENGAGEMENT_TIPS.map((t, i) => (
            <div key={i} className={`p-3 rounded-lg border text-xs ${t.impact === 'Critical' ? 'bg-red-400/5 border-red-400/20' : t.impact === 'High' ? 'bg-primary/5 border-primary/20' : 'bg-muted/20 border-border'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className={`font-bold ${t.impact === 'Critical' ? 'text-red-400' : t.impact === 'High' ? 'text-primary' : 'text-foreground'}`}>{t.tip}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${t.impact === 'Critical' ? 'bg-red-400/10 text-red-400 border-red-400/30' : t.impact === 'High' ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted text-muted-foreground border-border'}`}>{t.impact}</span>
              </div>
              <p className="text-muted-foreground">{t.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SocialMediaPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | 'all'>('all');
  const [socialTab, setSocialTab] = useState<'posts' | 'hashtags' | 'templates' | 'timing'>('posts');
  const [genOpen, setGenOpen] = useState(false);
  const [genVehicle, setGenVehicle] = useState('');
  const [genPlatform, setGenPlatform] = useState<SocialPlatform>('instagram');
  const [genType, setGenType] = useState('instagram_caption');
  const [genHighlights, setGenHighlights] = useState('');
  const [genPrice, setGenPrice] = useState('');
  const [genResult, setGenResult] = useState('');
  const [genHashtags, setGenHashtags] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<{ id: string; label: string }[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setPosts(await fetchSocialPosts({ platform: platformFilter })); }
    finally { setLoading(false); }
  }, [platformFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetchVehicles({ pageSize: 30 }).then(({ data }) =>
      setVehicles(data.map(v => ({ id: v.id, label: `${v.make} ${v.model} ${v.variant ?? ''} ${v.model_year ?? ''}`.trim() })))
    );
  }, []);

  const generate = () => {
    if (!genVehicle.trim()) { toast.error('Enter vehicle name'); return; }
    setGenLoading(true); setGenResult(''); setGenHashtags('');
    abortRef.current = new AbortController();
    const prompt = `You are Wulfrayn's DB AI Copilot. Generate ${genType.replace(/_/g, ' ')} for:
Vehicle: ${genVehicle}
${genPrice ? `Price: PKR ${genPrice}` : ''}
${genHighlights ? `Highlights: ${genHighlights}` : ''}

Requirements:
- Platform: ${genPlatform}
- Sound premium, professional, not robotic
- Pakistani market context
- Include a strong call to action
- If Instagram/Facebook/LinkedIn, also generate 8-12 relevant hashtags on a separate line starting with "HASHTAGS:"
- Keep content appropriate for each platform's character limits
- Mention PKR pricing if provided`;

    streamLLMQueued({
      functionName: 'large-language-model',
      requestBody: {
        systemInstruction: "You are Wulfrayn's DB AI Sales Copilot.",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      onChunk: c => setGenResult(p => p + c),
      onComplete: () => {
        setGenLoading(false);
        // Extract hashtags if present
        setGenResult(p => {
          const lines = p.split('\n');
          const hIdx = lines.findIndex(l => l.trim().startsWith('HASHTAGS:'));
          if (hIdx !== -1) {
            setGenHashtags(lines[hIdx].replace('HASHTAGS:', '').trim());
            return lines.filter((_, i) => i !== hIdx).join('\n').trim();
          }
          return p;
        });
      },
      onError: (e) => { setGenLoading(false); toast.error(e.message.includes('429') ? 'Rate limit - retry in a moment' : 'AI failed'); },
      signal: abortRef.current.signal,
    });
  };

  const savePost = async () => {
    if (!genResult.trim()) return;
    try {
      await saveSocialPost({
        vehicle_name: genVehicle, platform: genPlatform,
        content: genResult, hashtags: genHashtags, status: 'draft',
      });
      toast.success('Post saved to library'); load();
    } catch { toast.error('Failed to save'); }
  };

  const copyText = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
    toast.success('Copied!');
  };

  const remove = async (id: string) => {
    try { await deleteSocialPost(id); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <AppLayout>
      <div className="px-4 md:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" /> Social Media & Listings
            </h1>
            <p className="text-xs text-muted-foreground">AI content, hashtag library, caption templates & best timing guide</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setGenResult(''); setGenHashtags(''); setGenOpen(true); }}>
            <Bot className="w-3.5 h-3.5" /> Generate Content
          </Button>
        </div>

        {/* Top tabs */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1.5 min-w-max">
            {[
              { id: 'posts', label: 'Post Library', icon: FileText },
              { id: 'hashtags', label: 'Hashtag Library', icon: Hash },
              { id: 'templates', label: 'Caption Templates', icon: BookOpen },
              { id: 'timing', label: 'Best Times & Tips', icon: Clock },
            ].map(tab => (
              <button key={tab.id} onClick={() => setSocialTab(tab.id as typeof socialTab)}
                className={cn('flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap',
                  socialTab === tab.id ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {socialTab === 'hashtags' && <HashtagLibraryTab />}
        {socialTab === 'templates' && <CaptionTemplatesTab />}
        {socialTab === 'timing' && <PostTimingTab />}

        {socialTab === 'posts' && (
          <div className="space-y-4">
            {/* Platform filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
              {[{ val: 'all', label: 'All' }, ...(Object.entries(PLATFORM_CONFIG).map(([k, v]) => ({ val: k, label: v.label })))].map(p => (
                <button key={p.val} onClick={() => setPlatformFilter(p.val as SocialPlatform | 'all')}
                  className={cn('text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap',
                    platformFilter === p.val ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/40'
                  )}>
                  {p.label}
                </button>
              ))}
            </div>
            {/* Posts grid */}
            {loading ? (
              <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                <Share2 className="w-10 h-10 opacity-20" />
                <p className="text-sm">No posts yet</p>
                <Button size="sm" onClick={() => setGenOpen(true)}>Generate First Post</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {posts.map(post => {
                  const cfg = PLATFORM_CONFIG[post.platform];
                  return (
                    <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="bg-card border-border h-full flex flex-col">
                        <CardHeader className="pb-2 pt-3 px-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1', cfg.color)}>
                                <cfg.icon className="w-2.5 h-2.5" />{cfg.label}
                              </span>
                              {post.vehicle_name && <span className="text-xs text-muted-foreground truncate">{post.vehicle_name}</span>}
                            </div>
                            <div className="flex gap-0.5 shrink-0">
                              <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground"
                                onClick={() => copyText(post.id, post.content + (post.hashtags ? '\n\n' + post.hashtags : ''))}>
                                {copied === post.id ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive"
                                onClick={() => remove(post.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="px-3 pb-3 flex-1">
                          <p className="text-xs text-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">{post.content}</p>
                          {post.hashtags && (
                            <p className="text-[10px] text-primary mt-2 leading-relaxed line-clamp-2">{post.hashtags}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-2">{new Date(post.created_at).toLocaleDateString()}</p>
                        </CardContent>
                        <div className="px-3 pb-3 pt-0 flex items-center gap-1.5 border-t border-border mt-auto">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5 flex-1 text-muted-foreground hover:text-foreground"
                            onClick={() => copyText(post.id, post.content + (post.hashtags ? '\n\n' + post.hashtags : ''))}>
                            {copied === post.id ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                            {copied === post.id ? 'Copied!' : 'Copy'}
                          </Button>
                          {cfg.shareUrl && (
                            <a href={cfg.shareUrl(post.content + (post.hashtags ? '\n\n' + post.hashtags : ''))} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1.5 w-full text-muted-foreground hover:text-foreground">
                                <ExternalLink className="w-3 h-3" /> Share
                              </Button>
                            </a>
                          )}
                          {cfg.url && (
                            <a href={cfg.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                              <Button variant="ghost" size="sm" className={cn('h-7 text-[10px] gap-1.5 w-full', cfg.color.split(' ')[0])}>
                                <cfg.icon className="w-3 h-3" /> Open
                              </Button>
                            </a>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      {/* Generate Dialog */}
      <Dialog open={genOpen} onOpenChange={open => { if (!open) abortRef.current?.abort(); setGenOpen(open); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" /> Generate Social Media Content
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto py-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Vehicle *</Label>
                <Input value={genVehicle} onChange={e => setGenVehicle(e.target.value)}
                  placeholder="e.g. Black Toyota Land Cruiser ZX 2022" className="h-8 text-xs bg-muted/40" />
                {vehicles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {vehicles.slice(0, 4).map(v => (
                      <button key={v.id} onClick={() => setGenVehicle(v.label)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground hover:text-foreground">
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Platform</Label>
                <Select value={genPlatform} onValueChange={v => setGenPlatform(v as SocialPlatform)}>
                  <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PLATFORM_CONFIG) as [SocialPlatform, { label: string }][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Content Type</Label>
                <Select value={genType} onValueChange={setGenType}>
                  <SelectTrigger className="h-8 text-xs bg-muted/40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(t => <SelectItem key={t.val} value={t.val}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Price (PKR)</Label>
                <Input value={genPrice} onChange={e => setGenPrice(e.target.value)} placeholder="12,500,000" className="h-8 text-xs bg-muted/40" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Key Highlights</Label>
              <Input value={genHighlights} onChange={e => setGenHighlights(e.target.value)}
                placeholder="e.g. First owner, 15,000km, sunroof, V8, all docs clear" className="h-8 text-xs bg-muted/40" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 gap-2" onClick={generate} disabled={genLoading || !genVehicle.trim()}>
                <Sparkles className="w-4 h-4" /> {genLoading ? 'Generating...' : 'Generate'}
              </Button>
              {genLoading && <Button variant="outline" onClick={() => abortRef.current?.abort()}>Stop</Button>}
            </div>
            {genResult && (
              <div className="space-y-2">
                <div className="relative bg-muted/30 rounded-xl p-3 border border-border">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {genResult}
                    {genLoading && <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse align-middle" />}
                  </p>
                  <button onClick={() => copyText('gen', genResult + (genHashtags ? '\n\n' + genHashtags : ''))}
                    className="absolute top-2 right-2 p-1 rounded text-muted-foreground hover:text-foreground">
                    {copied === 'gen' ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                {genHashtags && (
                  <div className="bg-primary/5 rounded-lg p-2 border border-primary/20">
                    <p className="text-[10px] font-semibold text-primary mb-1">Hashtags</p>
                    <p className="text-xs text-foreground">{genHashtags}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGenOpen(false)}>Close</Button>
            {genResult && !genLoading && (
              <Button onClick={savePost} className="gap-2">
                <Plus className="w-3.5 h-3.5" /> Save to Library
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}
