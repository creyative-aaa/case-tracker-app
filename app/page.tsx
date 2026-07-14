'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  Bot,
  BriefcaseBusiness,
  CircleDollarSign,
  FileBarChart,
  GraduationCap,
  KeyRound,
  LogIn,
  LogOut,
  MessageCircle,
  MessageSquareText,
  Plus,
  Search,
  Sparkles,
  Tags,
  UserCircle,
  UserRoundPlus,
  Wrench,
  X,
} from 'lucide-react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type { User } from '@supabase/supabase-js';
import {
  createClient,
  hasSupabaseConfig,
  loadSupabaseConfig,
  type SupabaseRuntimeConfig,
} from '@/lib/supabase';

type CaseItem = {
  id: string | number;
  title: string;
  category: string | null;
  error_description: string;
  error_image_url: string | null;
  solution: string;
  created_by_email: string | null;
  created_at: string;
};

const categoryOptions = [
  'Semua',
  'Akademik',
  'Keuangan',
  'PMB',
  'Pelaporan',
  'Karir Link',
  'Lain-lain',
];

const categoryStyles: Record<
  string,
  { icon: typeof GraduationCap; className: string }
> = {
  Akademik: { icon: GraduationCap, className: 'bg-[#3DD6FF]' },
  Keuangan: { icon: CircleDollarSign, className: 'bg-white' },
  PMB: { icon: UserRoundPlus, className: 'bg-[#FF4D8D]' },
  Pelaporan: { icon: FileBarChart, className: 'bg-[#3DD6FF]' },
  'Karir Link': { icon: BriefcaseBusiness, className: 'bg-white' },
};

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function getCategoryMeta(category: string | null) {
  return categoryStyles[category ?? ''] ?? {
    icon: Tags,
    className: 'bg-white',
  };
}

export default function Home() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [input, setInput] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState('');
  const [supabaseConfig, setSupabaseConfig] =
    useState<SupabaseRuntimeConfig | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userApiKey, setUserApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const supabase = useMemo(() => createClient(supabaseConfig), [supabaseConfig]);

  useEffect(() => {
    queueMicrotask(() => {
      const savedApiKey =
        localStorage.getItem('case-tracker-google-api-key') ?? '';

      setUserApiKey(savedApiKey);
      setApiKeyInput(savedApiKey);
    });
  }, []);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await loadSupabaseConfig();

      setSupabaseConfig(config);
      setIsConfigLoading(false);
    };

    loadConfig();
  }, []);

  useEffect(() => {
    if (isConfigLoading) {
      return;
    }

    if (!supabase) {
      queueMicrotask(() => setIsCheckingAuth(false));
      return;
    }

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setSessionToken(session?.access_token ?? '');
      setIsCheckingAuth(false);

      if (window.location.search.includes('code=')) {
        window.history.replaceState({}, '', '/');
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSessionToken(session?.access_token ?? '');
      setIsCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [isConfigLoading, supabase]);

  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        headers:
          userApiKey && sessionToken
            ? {
                authorization: `Bearer ${sessionToken}`,
                'x-google-api-key': userApiKey,
              }
            : undefined,
      }),
    [sessionToken, userApiKey],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport: chatTransport,
  });
  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    const fetchCases = async () => {
      if (!supabase) return;

      const { data } = await supabase
        .from('cases')
        .select(
          'id,title,category,error_description,error_image_url,solution,created_by_email,created_at',
        )
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) {
        setCases(data);
      }
    };

    fetchCases();
  }, [supabase]);

  const filteredCases = cases.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      item.title.toLowerCase().includes(query) ||
      item.error_description.toLowerCase().includes(query) ||
      item.solution.toLowerCase().includes(query);
    const matchesCategory =
      activeCategory === 'Semua' ||
      (item.category ?? 'Lain-lain') === activeCategory;

    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = input.trim();
    if (!text || isLoading || !user || !userApiKey) return;

    setInput('');
    await sendMessage({ text });
  };

  const handleSignInWithGoogle = async () => {
    if (!supabase) {
      setProfileMessage('Supabase belum dikonfigurasi di .env.local.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setProfileMessage(
        error.message.includes('Unsupported provider')
          ? 'Google login belum diaktifkan di Supabase Auth Providers.'
          : error.message,
      );
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;

    await supabase.auth.signOut();
    setUser(null);
    setSessionToken('');
  };

  const handleSaveApiKey = () => {
    const cleanedApiKey = apiKeyInput.trim();

    if (!cleanedApiKey) {
      setProfileMessage('Isi Gemini API key terlebih dahulu.');
      return;
    }

    localStorage.setItem('case-tracker-google-api-key', cleanedApiKey);
    setUserApiKey(cleanedApiKey);
    setProfileMessage('Gemini API key berhasil disimpan di profil browser ini.');
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FFF2C7] bg-[linear-gradient(#111_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:34px_34px] text-black">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
        <header className="mb-5 border-4 border-black bg-[#FFB000] p-4 shadow-[6px_6px_0_#111] sm:p-5 sm:shadow-[10px_10px_0_#111]">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[4px_4px_0_#111]">
                <Sparkles className="h-3.5 w-3.5" />
                Case Tracker ALDI
              </div>
              <h1 className="text-3xl font-black uppercase leading-none tracking-normal sm:text-4xl lg:text-6xl">
                Knowledge Base Support
              </h1>
              <p className="mt-4 max-w-2xl text-base font-bold leading-7">
                Cari permasalahan yang pernah ditangani, lihat screenshot
                error, lalu pakai AI support jika butuh bantuan cepat.
              </p>
            </div>

            <section className="w-full border-4 border-black bg-white p-3 shadow-[5px_5px_0_#111] sm:max-w-sm sm:shadow-[7px_7px_0_#111]">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase">
                <UserCircle className="h-4 w-4" />
                Profil Login
              </div>

              {isCheckingAuth ? (
                <p className="border-2 border-black bg-[#FFF2C7] p-2 text-xs font-black">
                  Mengecek login...
                </p>
              ) : user ? (
                <div className="space-y-3">
                  <div className="break-all border-2 border-black bg-[#E9FF70] p-2 text-xs font-black">
                    {user.email ?? 'Google User'}
                  </div>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs font-black uppercase">
                      <KeyRound className="h-3.5 w-3.5" />
                      Gemini API Key
                    </span>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(event) =>
                        setApiKeyInput(event.target.value)
                      }
                      placeholder="Tempel API key Google AI Studio"
                      className="w-full border-4 border-black bg-[#FFF2C7] px-3 py-2 text-xs font-bold outline-none"
                    />
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="border-4 border-black bg-[#3DD6FF] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#111]"
                    >
                      Simpan Key
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center justify-center gap-1 border-4 border-black bg-white px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#111]"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Logout
                    </button>
                  </div>
                  {userApiKey && (
                    <Link
                      href="/add-case"
                      className="inline-flex w-full items-center justify-center gap-2 border-4 border-black bg-[#FF4D8D] px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#111]"
                    >
                      <Plus className="h-4 w-4" />
                      Input Case
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSignInWithGoogle}
                  className="inline-flex w-full items-center justify-center gap-2 border-4 border-black bg-[#E9FF70] px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_#111]"
                >
                  <LogIn className="h-4 w-4" />
                  Login Google
                </button>
              )}

              {profileMessage && (
                <p className="mt-3 border-2 border-black bg-[#FFD84D] p-2 text-xs font-black">
                  {profileMessage}
                </p>
              )}
            </section>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
            <label className="flex items-center gap-3 border-4 border-black bg-white px-4 py-3 shadow-[5px_5px_0_#111]">
              <Search className="h-5 w-5 shrink-0" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-neutral-500"
                placeholder="Cari case: pembayaran, KRS, PMB, laporan, akun..."
              />
            </label>

            <div className="border-4 border-black bg-[#E9FF70] px-4 py-3 text-sm font-black uppercase shadow-[5px_5px_0_#111]">
              {filteredCases.length} solusi tersedia
            </div>
          </div>
        </header>

        <div className="grid gap-5">
          <section className="min-h-[32rem] border-4 border-black bg-[#F8F8F8] shadow-[6px_6px_0_#111] sm:shadow-[10px_10px_0_#111] lg:min-h-[42rem]">
            <div className="border-b-4 border-black bg-white p-4">
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((category) => {
                  const selected = activeCategory === category;

                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`border-4 border-black px-3 py-2 text-xs font-black uppercase shadow-[4px_4px_0_#111] transition hover:-translate-x-1 hover:-translate-y-1 ${
                        selected ? 'bg-[#3DD6FF]' : 'bg-white'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-[28rem] overflow-y-auto p-3 sm:p-4 lg:max-h-[calc(100vh-19rem)] lg:min-h-[34rem]">
              {!isConfigLoading && !hasSupabaseConfig(supabaseConfig) && (
                <p className="mb-4 border-4 border-black bg-[#FFD84D] p-3 text-sm font-bold shadow-[5px_5px_0_#111]">
                  Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL
                  dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY di .env.local.
                </p>
              )}

              {filteredCases.length === 0 ? (
                <div className="grid h-80 place-items-center border-4 border-dashed border-black bg-white">
                  <div className="max-w-xs text-center">
                    <div className="mx-auto mb-4 grid h-14 w-14 place-items-center border-4 border-black bg-[#3DD6FF] shadow-[6px_6px_0_#111]">
                      <Wrench className="h-7 w-7" />
                    </div>
                    <h2 className="text-xl font-black uppercase">
                      Solusi belum ketemu
                    </h2>
                    <p className="mt-2 text-sm font-bold">
                      Coba kata kunci lain atau tanyakan ke AI support di panel
                      kanan.
                    </p>
                  </div>
                </div>
              ) : (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCases.map((c) => {
                    const category = getCategoryMeta(c.category);
                    const CategoryIcon = category.icon;

                    return (
                      <li
                        key={c.id}
                        className="overflow-hidden border-4 border-black bg-white shadow-[5px_5px_0_#111] sm:shadow-[7px_7px_0_#111]"
                      >
                        {c.error_image_url ? (
                          <a
                            href={c.error_image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="block aspect-[16/10] overflow-hidden border-b-2 border-black bg-white"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={c.error_image_url}
                              alt={`Screenshot error untuk ${c.title}`}
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ) : (
                          <div className="grid aspect-[16/10] place-items-center border-b-2 border-black bg-[#3DD6FF]">
                            <div className="text-center">
                              <div className="mx-auto mb-3 grid h-14 w-14 place-items-center border-2 border-black bg-white shadow-[3px_3px_0_#111]">
                                <MessageSquareText className="h-7 w-7 text-[#2563EB]" />
                              </div>
                              <p className="text-xs font-black uppercase text-[#2563EB]">
                                Gambar belum tersedia
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span
                              className={`inline-flex min-w-0 items-center gap-1.5 border-2 border-black px-2.5 py-1 text-xs font-black uppercase shadow-[3px_3px_0_#111] ${category.className}`}
                            >
                              <CategoryIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {c.category ?? 'Lain-lain'}
                              </span>
                            </span>
                          </div>

                          <h3 className="line-clamp-2 text-lg font-black leading-snug">
                            {c.title}
                          </h3>

                          <p className="mt-3 line-clamp-4 text-sm font-bold leading-6 text-neutral-500">
                            {c.error_description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          <section
            className={`bottom-4 right-4 z-50 h-[min(42rem,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-md flex-col border-4 border-black bg-[#111] shadow-[6px_6px_0_#FF4D8D] sm:bottom-6 sm:right-6 sm:shadow-[10px_10px_0_#FF4D8D] ${
              isChatOpen ? 'fixed flex' : 'hidden'
            }`}
          >
            <div className="border-b-4 border-black bg-[#3DD6FF] px-5 py-5 text-black">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center border-4 border-black bg-[#E9FF70] shadow-[5px_5px_0_#111]">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase sm:text-xl">
                      Tanya AI Support
                    </h2>
                    <p className="text-sm font-bold">
                      Jelaskan masalahmu, AI bantu cari solusi dari knowledge
                      base.
                    </p>
                  </div>
                </div>
                <div className="hidden border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[3px_3px_0_#111] sm:block">
                  {user && userApiKey ? 'AI Ready' : 'Login Required'}
                </div>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center border-2 border-black bg-white text-black shadow-[3px_3px_0_#111]"
                  aria-label="Tutup chat AI"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto bg-[#202020] p-4">
              {!user && (
                <div className="grid h-full min-h-80 place-items-center">
                  <div className="max-w-md border-4 border-black bg-white p-6 text-center shadow-[8px_8px_0_#3DD6FF]">
                    <div className="mx-auto mb-5 grid h-16 w-16 place-items-center border-4 border-black bg-[#FFB000] shadow-[5px_5px_0_#111]">
                      <LogIn className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black uppercase sm:text-2xl">
                      Login dulu
                    </h3>
                    <p className="mt-3 text-sm font-bold leading-6">
                      AI chat aktif setelah kamu login Google dan menyimpan
                      Gemini API key di profil.
                    </p>
                  </div>
                </div>
              )}

              {user && !userApiKey && (
                <div className="grid h-full min-h-80 place-items-center">
                  <div className="max-w-md border-4 border-black bg-[#FFD84D] p-6 text-center shadow-[8px_8px_0_#3DD6FF]">
                    <div className="mx-auto mb-5 grid h-16 w-16 place-items-center border-4 border-black bg-white shadow-[5px_5px_0_#111]">
                      <KeyRound className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black uppercase sm:text-2xl">
                      Set API key di profil
                    </h3>
                    <p className="mt-3 text-sm font-bold leading-6">
                      Isi Gemini API key di panel Profil Login supaya AI bisa
                      menjawab dengan key milik user yang sedang login.
                    </p>
                  </div>
                </div>
              )}

              {user && userApiKey && messages.length === 0 && (
                <div className="grid h-full min-h-80 place-items-center">
                  <div className="max-w-md border-4 border-black bg-white p-6 text-center shadow-[8px_8px_0_#3DD6FF]">
                    <div className="mx-auto mb-5 grid h-16 w-16 place-items-center border-4 border-black bg-[#FFB000] shadow-[5px_5px_0_#111]">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-black uppercase sm:text-2xl">
                      Langsung tanya aja
                    </h3>
                    <p className="mt-3 text-sm font-bold leading-6">
                      Contoh: tagihan mahasiswa tidak muncul, gagal cetak KRS,
                      atau laporan tidak bisa diekspor.
                    </p>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] border-4 border-black px-4 py-3 text-sm font-bold leading-6 shadow-[6px_6px_0_#000] ${
                      m.role === 'user'
                        ? 'bg-[#E9FF70] text-black'
                        : 'bg-white text-black'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {getMessageText(m)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="inline-flex items-center gap-2 border-4 border-black bg-[#FFD84D] px-3 py-2 text-sm font-black shadow-[5px_5px_0_#000]">
                  <span className="h-3 w-3 animate-pulse rounded-full border-2 border-black bg-[#FF4D8D]" />
                  AI sedang berpikir...
                </div>
              )}

              {error && (
                <div className="border-4 border-black bg-[#FF4D8D] p-3 text-sm font-black text-black shadow-[5px_5px_0_#000]">
                  Chat error: {error.message}
                </div>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="border-t-4 border-black bg-[#FFB000] p-4"
            >
              <div className="flex items-center gap-2 border-4 border-black bg-white p-2 shadow-[7px_7px_0_#111]">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  disabled={!user || !userApiKey}
                  placeholder={
                    user && userApiKey
                      ? 'Tulis masalah yang kamu alami...'
                      : 'Login dan set API key di profil dulu...'
                  }
                  className="min-w-0 flex-1 border-0 bg-white px-3 py-2 text-sm font-bold text-black outline-none placeholder:text-neutral-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !user || !userApiKey}
                  className="grid h-11 w-11 shrink-0 place-items-center border-4 border-black bg-[#3DD6FF] text-black shadow-[4px_4px_0_#111] transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[7px_7px_0_#111] disabled:translate-x-0 disabled:translate-y-0 disabled:bg-neutral-300 disabled:shadow-none"
                  aria-label="Kirim pesan"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 border-4 border-black bg-[#3DD6FF] px-4 py-3 text-sm font-black uppercase text-black shadow-[5px_5px_0_#111] sm:bottom-6 sm:right-6"
      >
        <MessageCircle className="h-5 w-5" />
        Tanya AI
      </button>
    </main>
  );
}
