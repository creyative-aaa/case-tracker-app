'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CheckCircle2,
  FileText,
  ImageIcon,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { AppShell } from '@/components/AppShell';
import {
  CASE_CATEGORIES,
  CASE_SELECT,
  type CaseItem,
  type EditableCase,
  formatCaseDate,
} from '@/lib/cases';
import {
  createClient,
  hasSupabaseConfig,
  loadSupabaseConfig,
  type SupabaseRuntimeConfig,
} from '@/lib/supabase';

export default function MyCasesPage() {
  const [config, setConfig] = useState<SupabaseRuntimeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [queryError, setQueryError] = useState('');
  const [search, setSearch] = useState('');
  const [createdNotice, setCreatedNotice] = useState(false);
  const [editingCase, setEditingCase] = useState<EditableCase | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMessage, setEditMessage] = useState('');
  const supabase = useMemo(() => createClient(config), [config]);

  useEffect(() => {
    queueMicrotask(() => {
      setCreatedNotice(new URLSearchParams(window.location.search).get('created') === '1');
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
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [configLoading, supabase]);

  useEffect(() => {
    if (!supabase || !user) {
      return;
    }

    const fetchMyCases = async () => {
      setCasesLoading(true);
      setQueryError('');
      const { data, error } = await supabase
        .from('cases')
        .select(CASE_SELECT)
        .eq('created_by_id', user.id)
        .order('created_at', { ascending: false });

      if (error) setQueryError(error.message);
      else setCases((data as CaseItem[]) ?? []);
      setCasesLoading(false);
    };

    fetchMyCases();
  }, [supabase, user]);

  const signIn = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/my-cases` },
    });
  };

  const openEdit = (caseItem: CaseItem) => {
    setEditingCase({
      id: caseItem.id,
      title: caseItem.title,
      category: caseItem.category ?? 'Lain-lain',
      error_description: caseItem.error_description,
      error_image_url: caseItem.error_image_url ?? '',
      solution: caseItem.solution,
    });
    setEditMessage('');
  };

  const saveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !editingCase || !user) return;

    setSaving(true);
    setEditMessage('');
    const { error } = await supabase
      .from('cases')
      .update({
        title: editingCase.title.trim(),
        category: editingCase.category,
        error_description: editingCase.error_description.trim(),
        error_image_url: editingCase.error_image_url.trim() || null,
        solution: editingCase.solution.trim(),
        resolution_steps: editingCase.solution.trim(),
      })
      .eq('id', editingCase.id)
      .eq('created_by_id', user.id);

    if (error) {
      setEditMessage(error.message);
      setSaving(false);
      return;
    }

    setCases((current) =>
      current.map((caseItem) =>
        caseItem.id === editingCase.id
          ? {
              ...caseItem,
              title: editingCase.title.trim(),
              category: editingCase.category,
              error_description: editingCase.error_description.trim(),
              error_image_url: editingCase.error_image_url.trim() || null,
              solution: editingCase.solution.trim(),
            }
          : caseItem,
      ),
    );
    setSaving(false);
    setEditingCase(null);
  };

  const filteredCases = cases.filter((caseItem) => {
    const normalizedSearch = search.trim().toLowerCase();
    return (
      !normalizedSearch ||
      caseItem.title.toLowerCase().includes(normalizedSearch) ||
      caseItem.error_description.toLowerCase().includes(normalizedSearch)
    );
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Workspace pribadi</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Case Saya</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Kelola dokumentasi case yang kamu buat tanpa memenuhi halaman depan.</p>
          </div>
          <Link href="/add-case" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Tambah case
          </Link>
        </header>

        {createdNotice && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            Case berhasil ditambahkan dan sudah tersedia di knowledge base.
          </div>
        )}

        {configLoading || authLoading ? (
          <div className="mt-8 h-72 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : !hasSupabaseConfig(config) ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>
        ) : !user ? (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600"><LogIn className="h-5 w-5" /></div>
            <h2 className="mt-4 text-lg font-semibold">Login untuk melihat case milikmu</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Case Saya hanya menampilkan dokumentasi yang dibuat oleh akun Google yang sedang aktif.</p>
            <button type="button" onClick={signIn} className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Login dengan Google</button>
          </section>
        ) : (
          <>
            <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari case milikmu..." className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none" />
              </div>
            </section>

            <div className="mt-7 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Dokumentasi saya</h2>
              <span className="text-sm text-slate-500">{filteredCases.length} case</span>
            </div>

            {casesLoading ? (
              <div className="mt-5 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>
            ) : queryError ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{queryError}</div>
            ) : filteredCases.length === 0 ? (
              <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><FileText className="h-5 w-5" /></div>
                <h2 className="mt-4 font-semibold">{cases.length === 0 ? 'Belum ada case' : 'Case tidak ditemukan'}</h2>
                <p className="mt-2 text-sm text-slate-500">{cases.length === 0 ? 'Mulai dokumentasikan solusi pertamamu.' : 'Coba gunakan kata kunci lain.'}</p>
                {cases.length === 0 && <Link href="/add-case" className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Tambah case</Link>}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredCases.map((caseItem) => (
                  <article key={caseItem.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                    <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg bg-slate-100 sm:w-36">
                      {caseItem.error_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={caseItem.error_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-slate-400"><ImageIcon className="h-5 w-5" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-blue-50 px-2 py-1 font-medium text-blue-700">{caseItem.category ?? 'Lain-lain'}</span>
                        <span>{formatCaseDate(caseItem.created_at)}</span>
                      </div>
                      <h3 className="mt-2 truncate font-semibold text-slate-900">{caseItem.title}</h3>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500">{caseItem.error_description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link href={`/cases/${caseItem.id}`} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Lihat <ArrowUpRight className="h-4 w-4" /></Link>
                      <button type="button" onClick={() => openEdit(caseItem)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Pencil className="h-4 w-4" /> Edit</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {editingCase && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <form onSubmit={saveEdit} className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-lg font-semibold">Edit case</h2><p className="mt-1 text-sm text-slate-500">Perbarui dokumentasi milikmu.</p></div>
              <button type="button" onClick={() => setEditingCase(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">Judul</span><input required value={editingCase.title} onChange={(event) => setEditingCase({ ...editingCase, title: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none" /></label>
              <label><span className="text-sm font-medium text-slate-700">Kategori</span><select value={editingCase.category} onChange={(event) => setEditingCase({ ...editingCase, category: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none">{!CASE_CATEGORIES.includes(editingCase.category as (typeof CASE_CATEGORIES)[number]) && <option>{editingCase.category}</option>}{CASE_CATEGORIES.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label><span className="text-sm font-medium text-slate-700">URL gambar</span><input type="url" value={editingCase.error_image_url} onChange={(event) => setEditingCase({ ...editingCase, error_image_url: event.target.value })} placeholder="https://..." className="mt-2 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm outline-none" /></label>
              <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">Deskripsi error</span><textarea required rows={5} value={editingCase.error_description} onChange={(event) => setEditingCase({ ...editingCase, error_description: event.target.value })} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-6 outline-none" /></label>
              <label className="sm:col-span-2"><span className="text-sm font-medium text-slate-700">Solusi</span><textarea required rows={6} value={editingCase.solution} onChange={(event) => setEditingCase({ ...editingCase, solution: event.target.value })} className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3.5 py-3 text-sm leading-6 outline-none" /></label>
            </div>
            {editMessage && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editMessage}</p>}
            <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
              <button type="button" onClick={() => setEditingCase(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Batal</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-slate-300">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Simpan perubahan</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
