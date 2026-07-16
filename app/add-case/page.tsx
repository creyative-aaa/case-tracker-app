'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileImage,
  Loader2,
  LogIn,
  Save,
  UploadCloud,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { AppShell } from '@/components/AppShell';
import { CASE_CATEGORIES } from '@/lib/cases';
import {
  createClient,
  hasSupabaseConfig,
  loadSupabaseConfig,
  type SupabaseRuntimeConfig,
} from '@/lib/supabase';

export default function AddCasePage() {
  const router = useRouter();
  const [config, setConfig] = useState<SupabaseRuntimeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string>(CASE_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [menuName, setMenuName] = useState('');
  const [errorDescription, setErrorDescription] = useState('');
  const [errorImageUrl, setErrorImageUrl] = useState('');
  const [errorImageFile, setErrorImageFile] = useState<File | null>(null);
  const [solution, setSolution] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = useMemo(() => createClient(config), [config]);

  useEffect(() => {
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
      setAuthLoading(false);
      if (window.location.search.includes('code=')) {
        window.history.replaceState({}, '', '/add-case');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configLoading, supabase]);

  const signIn = async () => {
    if (!supabase) {
      setMessage('Supabase belum dikonfigurasi.');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/add-case` },
    });
    if (error) setMessage(error.message);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !user) {
      setMessage('Login dengan Google terlebih dahulu.');
      return;
    }

    setSaving(true);
    setMessage('');

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setSaving(false);
      setMessage('Sesi login sudah berakhir. Silakan login kembali.');
      return;
    }

    const selectedCategory = category === 'Lain-lain' ? customCategory.trim() : category;
    let imageUrl = errorImageUrl.trim();

    if (errorImageFile) {
      if (errorImageFile.size > 5 * 1024 * 1024) {
        setSaving(false);
        setMessage('Ukuran gambar maksimal 5 MB.');
        return;
      }

      const extension = errorImageFile.name.split('.').pop() ?? 'png';
      const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('case-images')
        .upload(filePath, errorImageFile, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        setSaving(false);
        setMessage(uploadError.message);
        return;
      }

      imageUrl = supabase.storage.from('case-images').getPublicUrl(filePath).data.publicUrl;
    }

    const { error } = await supabase.from('cases').insert({
      title: title.trim(),
      category: selectedCategory,
      module_name: moduleName.trim(),
      menu_name: menuName.trim(),
      error_description: errorDescription.trim(),
      error_image_url: imageUrl || null,
      solution: solution.trim(),
      resolution_steps: solution.trim(),
      created_by_id: session.user.id,
      created_by_email: session.user.email,
    });

    if (error) {
      setSaving(false);
      setMessage(error.message);
      return;
    }

    router.replace('/my-cases?created=1');
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke knowledge base
        </Link>

        <header className="mt-6">
          <p className="text-sm font-medium text-blue-600">Dokumentasi baru</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Tambah case</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Dokumentasikan masalah dan solusi yang sudah berhasil diterapkan.
          </p>
        </header>

        {configLoading || authLoading ? (
          <div className="mt-8 h-96 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : !hasSupabaseConfig(config) ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
            Supabase belum dikonfigurasi. Form belum dapat digunakan.
          </div>
        ) : !user ? (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <LogIn className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Login untuk menambah case</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Setiap case disimpan atas nama pengguna agar dapat dikelola kembali melalui halaman Case Saya.
            </p>
            <button type="button" onClick={signIn} className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Login dengan Google
            </button>
            {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-semibold text-slate-900">Informasi case</h2>
                <p className="mt-1 text-sm text-slate-500">Berikan identitas singkat agar case mudah ditemukan.</p>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-sm font-medium text-slate-700">Judul case</span>
                  <input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Tagihan mahasiswa tidak muncul" className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none" />
                </label>
                <label>
                  <span className="text-sm font-medium text-slate-700">Kategori</span>
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none">
                    {CASE_CATEGORIES.map((option) => <option key={option}>{option}</option>)}
                  </select>
                </label>
                {category === 'Lain-lain' && (
                  <label>
                    <span className="text-sm font-medium text-slate-700">Nama kategori</span>
                    <input required value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="Contoh: LMS" className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none" />
                  </label>
                )}
                <label>
                  <span className="text-sm font-medium text-slate-700">Modul sistem</span>
                  <input required value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="Contoh: Keuangan Mahasiswa" className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none" />
                  <span className="mt-1.5 block text-xs text-slate-500">Kelompok fitur utama tempat proses dijalankan.</span>
                </label>
                <label>
                  <span className="text-sm font-medium text-slate-700">Menu sistem</span>
                  <input required value={menuName} onChange={(event) => setMenuName(event.target.value)} placeholder="Contoh: Tagihan &gt; Generate Tagihan" className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none" />
                  <span className="mt-1.5 block text-xs text-slate-500">Tuliskan menu atau submenu yang harus dibuka.</span>
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-semibold text-slate-900">Detail masalah</h2>
                <p className="mt-1 text-sm text-slate-500">Jelaskan gejala, pesan error, dan kondisi saat masalah terjadi.</p>
              </div>
              <label className="mt-5 block">
                <span className="text-sm font-medium text-slate-700">Deskripsi error</span>
                <textarea required rows={7} value={errorDescription} onChange={(event) => setErrorDescription(event.target.value)} placeholder="Tuliskan detail permasalahan..." className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-6 outline-none" />
              </label>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-semibold text-slate-900">Solusi</h2>
                <p className="mt-1 text-sm text-slate-500">Tuliskan langkah penyelesaian yang sudah terbukti berhasil.</p>
              </div>
              <textarea required rows={8} value={solution} onChange={(event) => setSolution(event.target.value)} placeholder="Jelaskan solusi secara berurutan..." className="mt-5 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-6 outline-none" />
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="font-semibold text-slate-900">Lampiran</h2>
                <p className="mt-1 text-sm text-slate-500">Tambahkan screenshot melalui upload atau URL publik.</p>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center hover:border-blue-400 hover:bg-blue-50/40">
                  {errorImageFile ? <FileImage className="h-6 w-6 text-blue-600" /> : <UploadCloud className="h-6 w-6 text-slate-400" />}
                  <span className="mt-2 text-sm font-medium text-slate-700">{errorImageFile?.name ?? 'Pilih screenshot'}</span>
                  <span className="mt-1 text-xs text-slate-500">PNG, JPG, atau WebP · Maks. 5 MB</span>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setErrorImageFile(event.target.files?.[0] ?? null)} className="sr-only" />
                </label>
                <label>
                  <span className="text-sm font-medium text-slate-700">Atau URL gambar</span>
                  <input type="url" value={errorImageUrl} onChange={(event) => setErrorImageUrl(event.target.value)} placeholder="https://..." className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none" />
                  <p className="mt-2 text-xs leading-5 text-slate-500">File yang diunggah akan diprioritaskan jika keduanya diisi.</p>
                </label>
              </div>
            </section>

            {message && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link href="/my-cases" className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</Link>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan case'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
