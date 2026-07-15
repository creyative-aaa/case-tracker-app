'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowUp,
  BookOpen,
  Bot,
  FolderKanban,
  KeyRound,
  LogIn,
  LogOut,
  Menu,
  Plus,
  Settings,
  Sparkles,
  UserCircle,
  X,
} from 'lucide-react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { User } from '@supabase/supabase-js';
import {
  createClient,
  loadSupabaseConfig,
  type SupabaseRuntimeConfig,
} from '@/lib/supabase';

const navItems = [
  { href: '/', label: 'Knowledge Base', icon: BookOpen },
  { href: '/my-cases', label: 'Case Saya', icon: FolderKanban },
  { href: '/add-case', label: 'Tambah Case', icon: Plus },
];

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [config, setConfig] = useState<SupabaseRuntimeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const supabase = useMemo(() => createClient(config), [config]);

  useEffect(() => {
    const savedKey = localStorage.getItem('case-tracker-google-api-key') ?? '';
    queueMicrotask(() => {
      setApiKey(savedKey);
      setApiKeyInput(savedKey);
    });

    loadSupabaseConfig().then((runtimeConfig) => {
      setConfig(runtimeConfig);
      setConfigLoading(false);
    });
  }, []);

  useEffect(() => {
    if (configLoading) return;
    if (!supabase) {
      queueMicrotask(() => setAuthLoading(false));
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setSessionToken(session?.access_token ?? '');
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSessionToken(session?.access_token ?? '');
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configLoading, supabase]);

  const signIn = async () => {
    if (!supabase) {
      setProfileMessage('Supabase belum dikonfigurasi.');
      setProfileOpen(true);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${pathname}` },
    });

    if (error) {
      setProfileMessage(error.message);
      setProfileOpen(true);
    }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setProfileOpen(false);
  };

  const saveApiKey = () => {
    const cleanedKey = apiKeyInput.trim();
    if (!cleanedKey) {
      setProfileMessage('Masukkan Gemini API key terlebih dahulu.');
      return;
    }

    localStorage.setItem('case-tracker-google-api-key', cleanedKey);
    setApiKey(cleanedKey);
    setProfileMessage('Gemini API key berhasil disimpan di browser ini.');
  };

  const nav = (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon className="h-4.5 w-4.5" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => {
          setChatOpen(true);
          setMobileMenuOpen(false);
        }}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      >
        <Bot className="h-4.5 w-4.5" />
        AI Support
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
          <Image src="/img/logo.png" alt="ALDI" width={40} height={40} className="rounded-lg" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Case Tracker</p>
            <p className="text-xs text-slate-500">ALDI Support</p>
          </div>
        </div>
        <div className="flex-1 px-4 py-6">{nav}</div>
        <div className="border-t border-slate-200 p-4">
          {authLoading ? (
            <div className="h-11 animate-pulse rounded-lg bg-slate-100" />
          ) : user ? (
            <button
              type="button"
              onClick={() => {
                setProfileMessage('');
                setProfileOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-100"
            >
              <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                {(user.email?.[0] ?? 'U').toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{user.email}</p>
                <p className="text-xs text-slate-500">Kelola profil</p>
              </div>
              <Settings className="h-4 w-4 text-slate-400" />
            </button>
          ) : (
            <button
              type="button"
              onClick={signIn}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" />
              Login Google
            </button>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/img/logo.png" alt="ALDI" width={34} height={34} className="rounded-lg" />
            <span className="text-sm font-semibold">Case Tracker</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => (user ? setProfileOpen(true) : signIn())}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
              aria-label={user ? 'Buka profil' : 'Login'}
            >
              <UserCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
              aria-label="Buka navigasi"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && <div className="border-t border-slate-200 px-3 py-3">{nav}</div>}
      </header>

      <div className="lg:pl-64">
        <main className="min-h-screen">{children}</main>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Profil dan AI</h2>
                <p className="mt-1 text-sm text-slate-500">{user?.email ?? 'Belum login'}</p>
              </div>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Tutup profil"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {user && (
              <div className="mt-6">
                <label className="text-sm font-medium text-slate-700" htmlFor="gemini-key">
                  Gemini API key
                </label>
                <div className="relative mt-2">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    id="gemini-key"
                    type="password"
                    value={apiKeyInput}
                    onChange={(event) => setApiKeyInput(event.target.value)}
                    placeholder="Masukkan API key Google AI Studio"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none"
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Key hanya disimpan di browser ini dan digunakan saat kamu membuka AI Support.
                </p>
                <button
                  type="button"
                  onClick={saveApiKey}
                  className="mt-3 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Simpan API key
                </button>
              </div>
            )}

            {!user && (
              <button
                type="button"
                onClick={signIn}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <LogIn className="h-4 w-4" />
                Login dengan Google
              </button>
            )}

            {profileMessage && (
              <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{profileMessage}</p>
            )}

            {user && (
              <button
                type="button"
                onClick={signOut}
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            )}
          </section>
        </div>
      )}

      <AiChatWidget
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        user={user}
        sessionToken={sessionToken}
        apiKey={apiKey}
        onOpenProfile={() => setProfileOpen(true)}
      />

      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 lg:bottom-7 lg:right-7"
        >
          <Sparkles className="h-4 w-4" />
          AI Support
        </button>
      )}
    </div>
  );
}

function AiChatWidget({
  open,
  onClose,
  user,
  sessionToken,
  apiKey,
  onOpenProfile,
}: {
  open: boolean;
  onClose: () => void;
  user: User | null;
  sessionToken: string;
  apiKey: string;
  onOpenProfile: () => void;
}) {
  const [input, setInput] = useState('');
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers:
          apiKey && sessionToken
            ? { authorization: `Bearer ${sessionToken}`, 'x-google-api-key': apiKey }
            : undefined,
      }),
    [apiKey, sessionToken],
  );
  const { messages, sendMessage, status, error } = useChat({ transport });
  const loading = status === 'submitted' || status === 'streaming';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || !user || !apiKey || loading) return;
    setInput('');
    await sendMessage({ text });
  };

  if (!open) return null;

  return (
    <section className="fixed inset-x-3 bottom-3 z-50 flex h-[min(680px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:left-auto sm:right-5 sm:w-[410px] lg:bottom-7 lg:right-7">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">AI Support</h2>
            <p className="text-xs text-slate-500">Jawaban dari knowledge base</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Tutup chat">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4">
        {!user || !apiKey ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-xs">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-100 text-blue-700">
                {user ? <KeyRound className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
              </div>
              <h3 className="mt-4 font-semibold">{user ? 'API key diperlukan' : 'Login diperlukan'}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {user
                  ? 'Simpan Gemini API key di profil untuk menggunakan AI Support.'
                  : 'Login dengan Google, lalu simpan Gemini API key milikmu.'}
              </p>
              <button type="button" onClick={onOpenProfile} className="mt-4 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">
                {user ? 'Buka profil' : 'Login Google'}
              </button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">Apa yang bisa kami bantu?</p>
            <p className="mt-1 text-sm leading-6 text-blue-700">Jelaskan error atau kendala yang kamu alami dengan detail.</p>
          </div>
        ) : null}

        {user && apiKey && messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-6 ${message.role === 'user' ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
              <div className="whitespace-pre-wrap">{getMessageText(message)}</div>
            </div>
          </div>
        ))}
        {loading && <p className="text-xs font-medium text-slate-500">AI sedang menyusun jawaban...</p>}
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
      </div>

      <form onSubmit={submit} className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white p-1.5 focus-within:border-blue-500 focus-within:ring-3 focus-within:ring-blue-100">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={!user || !apiKey}
            placeholder={user && apiKey ? 'Tulis pertanyaan...' : 'Login dan atur API key dulu'}
            className="min-w-0 flex-1 border-0 px-2.5 py-2 text-sm outline-none"
          />
          <button type="submit" disabled={!input.trim() || !user || !apiKey || loading} className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white disabled:bg-slate-300" aria-label="Kirim pesan">
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </form>
    </section>
  );
}
