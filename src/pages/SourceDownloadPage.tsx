import React, { useState } from 'react';
import { Lock, Download, Eye, EyeOff, FileArchive, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/components/layouts/AppLayout';
import { cn } from '@/lib/utils';

const CORRECT_PASSWORD = 'rpm123@';
const FILE_PATH = '/sourcecode.zip';
const FILE_NAME = 'wulfrayn-db-v79-sourcecode.zip';

const FILE_CONTENTS = [
  'src/ — All React components, pages, hooks, lib, types, data (160+ files)',
  'android/ — Capacitor Android project (full build)',
  '.rules/ — Project rules and guidelines',
  '.skills/ — Supabase client & server skill references',
  'docs/ — Design documentation (DESIGN.md)',
  'supabase/ — Edge Functions & migrations',
  'tasks/ — Task outputs and skill deliverables',
  'ANDROID_BUILD.md, biome.json, capacitor.config.ts',
  'components.json, index.html',
  'package.json, pnpm-workspace.yaml, pnpm-lock.yaml',
  'postcss.config.js, tailwind.config.js',
  'tsconfig.app.json, tsconfig.check.json, tsconfig.json, tsconfig.node.json',
  'vite.config.ts, README.md, sgconfig.yml',
];

export default function SourceDownloadPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleUnlock = () => {
    setChecking(true);
    setTimeout(() => {
      if (password === CORRECT_PASSWORD) {
        setUnlocked(true);
        setError('');
      } else {
        setError('Incorrect password. Please try again.');
      }
      setChecking(false);
    }, 400);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = FILE_PATH;
    a.download = FILE_NAME;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-start gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <FileArchive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Source Code Download</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete project source code — password protected.
            </p>
          </div>
        </div>

        {/* Contents card */}
        <Card className="bg-card border-border mb-6">
          <CardHeader className="px-5 py-4 pb-3">
            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
              <FileArchive className="w-4 h-4 text-primary" />
              Archive Contents
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ul className="space-y-1.5">
              {FILE_CONTENTS.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Auth / download card */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            {!unlocked ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Password Required</p>
                    <p className="text-xs text-muted-foreground">Enter the archive password to unlock the download.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                      placeholder="Enter password"
                      className={cn(
                        'pr-10 bg-muted/30 border-border text-sm',
                        error && 'border-destructive focus-visible:ring-destructive'
                      )}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {error && (
                    <div className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {error}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleUnlock}
                  disabled={!password || checking}
                  className="w-full"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {checking ? 'Verifying…' : 'Unlock Download'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Access Granted</p>
                    <p className="text-xs text-muted-foreground">Your download is ready — includes all source files.</p>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileArchive className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm text-foreground truncate font-mono">{FILE_NAME}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">~3.1 MB</span>
                </div>

                <Button onClick={handleDownload} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download ZIP
                </Button>

                <p className="text-center text-[11px] text-muted-foreground">
                  The ZIP file itself is also password-protected with the same password.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
