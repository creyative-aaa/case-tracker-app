'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  FileBarChart,
  GraduationCap,
  Layers3,
  LogIn,
  LogOut,
  ImagePlus,
  Save,
  Tags,
  UserRoundPlus,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';

const categoryOptions = [
  'Akademik',
  'Keuangan',
  'PMB',
  'Pelaporan',
  'Karir Link',
  'Lain-lain',
];

const categoryIcons: Record<string, typeof GraduationCap> = {
  Akademik: GraduationCap,
  Keuangan: CircleDollarSign,
  PMB: UserRoundPlus,
  Pelaporan: FileBarChart,
  'Karir Link': BriefcaseBusiness,
  'Lain-lain': Tags,
};

export default function AddCasePage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(Boolean(supabase));
  const [userApiKey, setUserApiKey] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categoryOptions[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [errorDescription, setErrorDescription] = useState('');
  const [errorImageUrl, setErrorImageUrl] = useState('');
  const [errorImageFile, setErrorImageFile] = useState<File | null>(null);
  const [solution, setSolution] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      const savedApiKey =
        localStorage.getItem('case-tracker-google-api-key') ?? '';

      setUserApiKey(savedApiKey);
    });
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);
      setIsCheckingAuth(false);

      if (window.location.search.includes('code=')) {
        window.history.replaceState({}, '', '/add-case');
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsCheckingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignInWithGoogle = async () => {
    if (!supabase) {
      setStatus('error');
      setMessage('Supabase belum dikonfigurasi di .env.local.');
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/add-case`,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(
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
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setStatus('error');
      setMessage('Supabase belum dikonfigurasi di .env.local.');
      return;
    }

    if (!userApiKey) {
      setStatus('error');
      setMessage('Simpan API key Google AI Studio terlebih dahulu.');
      return;
    }

    if (!user) {
      setStatus('error');
      setMessage('Login dengan Google terlebih dahulu sebelum input case.');
      return;
    }

    setStatus('saving');
    setMessage('');

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const currentUser = session?.user;

    if (!currentUser) {
      setStatus('error');
      setMessage('Sesi login sudah habis. Login ulang dengan Google.');
      return;
    }

    const selectedCategory =
      category === 'Lain-lain' ? customCategory.trim() : category;
    let uploadedImageUrl = errorImageUrl.trim();

    if (errorImageFile) {
      const fileExt = errorImageFile.name.split('.').pop() ?? 'png';
      const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('case-images')
        .upload(filePath, errorImageFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        setStatus('error');
        setMessage(
          uploadError.message.includes('Bucket not found')
            ? 'Bucket case-images belum dibuat. Jalankan SQL Storage setup di Supabase.'
            : uploadError.message,
        );
        return;
      }

      const { data } = supabase.storage
        .from('case-images')
        .getPublicUrl(filePath);

      uploadedImageUrl = data.publicUrl;
    }

    const { error } = await supabase.from('cases').insert({
      title,
      category: selectedCategory,
      error_description: errorDescription,
      error_image_url: uploadedImageUrl || null,
      solution,
      resolution_steps: solution,
      created_by_id: currentUser.id,
      created_by_email: currentUser.email,
    });

    if (error) {
      setStatus('error');
      setMessage(
        error.message.includes('schema cache')
          ? `Database belum punya kolom yang dibutuhkan: ${error.message}. Jalankan ulang SQL migration di Supabase, lalu refresh schema cache.`
          : error.message,
      );
      return;
    }

    setStatus('success');
    setMessage('Case berhasil ditambahkan.');
    setTitle('');
    setCategory(categoryOptions[0]);
    setCustomCategory('');
    setErrorDescription('');
    setErrorImageUrl('');
    setErrorImageFile(null);
    setSolution('');
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FFF2C7] bg-[linear-gradient(#111_1px,transparent_1px),linear-gradient(90deg,#111_1px,transparent_1px)] bg-[size:34px_34px] px-3 py-4 text-black sm:px-4 sm:py-5 lg:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-4 border-black bg-[#FFB000] p-4 shadow-[6px_6px_0_#111] sm:p-5 sm:shadow-[9px_9px_0_#111]">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-1 text-xs font-black uppercase shadow-[4px_4px_0_#111]">
              <Layers3 className="h-3.5 w-3.5" />
              Knowledge Builder
            </div>
            <h1 className="text-2xl font-black uppercase leading-none tracking-normal sm:text-3xl lg:text-5xl">
              Tambah Case Baru
            </h1>
            <p className="mt-3 max-w-xl text-sm font-bold">
              Simpan error dan solusi dalam format yang gampang dicari ulang.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex w-full items-center justify-center gap-2 border-4 border-black bg-white px-4 py-3 text-sm font-black uppercase shadow-[5px_5px_0_#111] transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#111] sm:w-auto sm:shadow-[6px_6px_0_#111] sm:hover:shadow-[10px_10px_0_#111]"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 border-4 border-black bg-[#FFD84D] p-4 text-sm font-black shadow-[6px_6px_0_#111]">
            Isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            di .env.local agar data bisa disimpan.
          </div>
        )}

        {isSupabaseConfigured && isCheckingAuth && (
          <div className="border-4 border-black bg-white p-6 text-lg font-black uppercase shadow-[8px_8px_0_#111]">
            Mengecek login...
          </div>
        )}

        {isSupabaseConfigured && !isCheckingAuth && !user && (
          <section className="border-4 border-black bg-white p-4 shadow-[6px_6px_0_#111] sm:p-6 sm:shadow-[10px_10px_0_#111]">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 border-2 border-black bg-[#3DD6FF] px-3 py-1 text-xs font-black uppercase shadow-[4px_4px_0_#111]">
                <LogIn className="h-3.5 w-3.5" />
                Login Required
              </div>
              <h2 className="text-2xl font-black uppercase leading-none sm:text-3xl">
                Masuk dulu untuk input case
              </h2>
              <p className="mt-3 text-sm font-bold leading-6">
                Halaman depan bisa dibuka semua pengunjung. Untuk menjaga data
                knowledge base tetap rapi, input case hanya bisa dilakukan
                setelah login dengan Google.
              </p>
            </div>

            {message && (
              <div className="mt-5 border-4 border-black bg-[#FF4D8D] p-3 text-sm font-black shadow-[5px_5px_0_#111]">
                {message}
              </div>
            )}

            <button
              type="button"
              onClick={handleSignInWithGoogle}
              className="mt-6 inline-flex w-full items-center justify-center gap-3 border-4 border-black bg-[#E9FF70] px-5 py-3 text-sm font-black uppercase shadow-[5px_5px_0_#111] transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0_#111] sm:w-auto sm:shadow-[7px_7px_0_#111] sm:hover:shadow-[11px_11px_0_#111]"
            >
              <span className="grid h-6 w-6 place-items-center border-2 border-black bg-white font-black">
                G
              </span>
              Login dengan Google
            </button>
          </section>
        )}

        {isSupabaseConfigured && !isCheckingAuth && user && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-4 border-black bg-[#E9FF70] p-4 text-sm font-black shadow-[6px_6px_0_#111]">
            <span>
              Login sebagai {user.email ?? user.user_metadata?.full_name ?? 'Google User'}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#111] transition hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        )}

        {isSupabaseConfigured && !isCheckingAuth && user && !userApiKey && (
          <section className="border-4 border-black bg-white p-4 shadow-[6px_6px_0_#111] sm:p-6 sm:shadow-[10px_10px_0_#111]">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 border-2 border-black bg-[#FFD84D] px-3 py-1 text-xs font-black uppercase shadow-[4px_4px_0_#111]">
                API Key Required
              </div>
              <h2 className="text-2xl font-black uppercase leading-none sm:text-3xl">
                Set API key di profil dulu
              </h2>
              <p className="mt-3 text-sm font-bold leading-6">
                Pengaturan Gemini API key sekarang ada di Profil Login halaman
                depan. Setelah tersimpan, balik lagi ke halaman ini untuk input
                case.
              </p>
            </div>

            <Link
              href="/"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 border-4 border-black bg-[#3DD6FF] px-5 py-3 text-sm font-black uppercase shadow-[5px_5px_0_#111] sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Buka Profil
            </Link>

            {message && (
              <div
                className={`mt-5 border-4 border-black p-3 text-sm font-black shadow-[5px_5px_0_#111] ${
                  status === 'success' ? 'bg-[#7CFF6B]' : 'bg-[#FF4D8D]'
                }`}
              >
                {message}
              </div>
            )}
          </section>
        )}

        {isSupabaseConfigured && !isCheckingAuth && user && userApiKey && (
        <form
          onSubmit={handleSubmit}
          className="grid gap-5 border-4 border-black bg-[#F8F8F8] p-4 shadow-[6px_6px_0_#111] sm:p-5 sm:shadow-[10px_10px_0_#111] lg:grid-cols-[0.85fr_1.15fr]"
        >
          <section className="space-y-4">
            <label className="block border-4 border-black bg-white p-4 shadow-[6px_6px_0_#111]">
              <span className="mb-2 block text-sm font-black uppercase">
                Judul Case
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                className="w-full border-4 border-black bg-[#FFF2C7] p-3 text-sm font-bold outline-none focus:bg-[#E9FF70]"
                placeholder="Contoh: Tagihan tidak muncul"
              />
            </label>

            <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0_#111]">
              <span className="mb-3 block text-sm font-black uppercase">
                Kategori
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {categoryOptions.map((option) => {
                  const Icon = categoryIcons[option];
                  const selected = category === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setCategory(option)}
                      className={`flex items-center gap-2 border-4 border-black px-3 py-2.5 text-left text-sm font-black uppercase shadow-[4px_4px_0_#111] transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[7px_7px_0_#111] ${
                        selected ? 'bg-[#3DD6FF]' : 'bg-[#F8F8F8]'
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            {category === 'Lain-lain' && (
              <label className="block border-4 border-black bg-white p-4 shadow-[6px_6px_0_#111]">
                <span className="mb-2 block text-sm font-black uppercase">
                  Kategori Lainnya
                </span>
                <input
                  value={customCategory}
                  onChange={(event) => setCustomCategory(event.target.value)}
                  required
                  className="w-full border-4 border-black bg-[#FFF2C7] p-3 text-sm font-bold outline-none focus:bg-[#E9FF70]"
                  placeholder="Contoh: LMS, Integrasi, Perpustakaan"
                />
              </label>
            )}
          </section>

          <section className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black uppercase">
                Deskripsi Error
              </span>
              <textarea
                value={errorDescription}
                onChange={(event) => setErrorDescription(event.target.value)}
                required
                rows={7}
                className="w-full resize-none border-4 border-black bg-white p-4 text-sm font-bold leading-6 outline-none shadow-[6px_6px_0_#111] focus:bg-[#FFF2C7]"
                placeholder="Tuliskan gejala, pesan error, user terdampak, dan kondisi saat masalah muncul."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black uppercase">
                Upload Gambar Error
              </span>
              <div className="border-4 border-black bg-white p-4 shadow-[6px_6px_0_#111]">
                <label className="flex cursor-pointer items-center justify-center gap-3 border-4 border-black bg-[#3DD6FF] px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0_#111] transition hover:-translate-x-1 hover:-translate-y-1">
                  <ImagePlus className="h-5 w-5" />
                  Pilih Gambar
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setErrorImageFile(event.target.files?.[0] ?? null)
                    }
                    className="sr-only"
                  />
                </label>
                {errorImageFile && (
                  <p className="mt-3 break-all text-xs font-black">
                    File: {errorImageFile.name}
                  </p>
                )}
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black uppercase">
                Atau Link Gambar Error
              </span>
              <input
                type="url"
                value={errorImageUrl}
                onChange={(event) => setErrorImageUrl(event.target.value)}
                className="w-full border-4 border-black bg-white p-4 text-sm font-bold leading-6 outline-none shadow-[6px_6px_0_#111] focus:bg-[#FFF2C7]"
                placeholder="Tempel URL screenshot error, contoh: https://..."
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-black uppercase">
                Solusi
              </span>
              <textarea
                value={solution}
                onChange={(event) => setSolution(event.target.value)}
                required
                rows={8}
                className="w-full resize-none border-4 border-black bg-white p-4 text-sm font-bold leading-6 outline-none shadow-[6px_6px_0_#111] focus:bg-[#FFF2C7]"
                placeholder="Tuliskan langkah penyelesaian yang berhasil."
              />
            </label>

            {message && (
              <div
                className={`flex items-center gap-2 border-4 border-black p-3 text-sm font-black shadow-[5px_5px_0_#111] ${
                  status === 'success' ? 'bg-[#7CFF6B]' : 'bg-[#FF4D8D]'
                }`}
              >
                {status === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'saving'}
              className="inline-flex w-full items-center justify-center gap-2 border-4 border-black bg-[#FF4D8D] px-5 py-3 text-sm font-black uppercase shadow-[7px_7px_0_#111] transition hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[11px_11px_0_#111] disabled:translate-x-0 disabled:translate-y-0 disabled:bg-neutral-300 disabled:shadow-none lg:w-auto"
            >
              <Save className="h-4 w-4" />
              {status === 'saving' ? 'Menyimpan...' : 'Simpan Case'}
            </button>
          </section>
        </form>
        )}
      </div>
    </main>
  );
}
