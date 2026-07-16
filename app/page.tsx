'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronDown, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { CaseCard } from '@/components/CaseCard';
import { CASE_CATEGORIES, CASE_SELECT, type CaseItem } from '@/lib/cases';
import {
  createClient,
  hasSupabaseConfig,
  loadSupabaseConfig,
  type SupabaseRuntimeConfig,
} from '@/lib/supabase';

const filterCategories = ['Semua', ...CASE_CATEGORIES];

export default function Home() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Semua');
  const [config, setConfig] = useState<SupabaseRuntimeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = useMemo(() => createClient(config), [config]);

  useEffect(() => {
    loadSupabaseConfig().then(setConfig);
  }, []);

  useEffect(() => {
    if (!config) {
      const timer = window.setTimeout(() => setLoading(false), 0);
      return () => window.clearTimeout(timer);
    }

    const fetchCases = async () => {
      setLoading(true);
      setError('');
      const { data, error: queryError } = await supabase!
        .from('cases')
        .select(CASE_SELECT)
        .order('created_at', { ascending: false })
        .limit(60);

      if (queryError) setError(queryError.message);
      else setCases((data as CaseItem[]) ?? []);
      setLoading(false);
    };

    fetchCases();
  }, [config, supabase]);

  const filteredCases = cases.filter((caseItem) => {
    const query = search.trim().toLowerCase();
    const matchesQuery =
      !query ||
      caseItem.title.toLowerCase().includes(query) ||
      caseItem.module_name?.toLowerCase().includes(query) ||
      caseItem.menu_name?.toLowerCase().includes(query) ||
      caseItem.error_description.toLowerCase().includes(query) ||
      caseItem.solution.toLowerCase().includes(query);
    const matchesCategory =
      category === 'Semua' || (caseItem.category ?? 'Lain-lain') === category;
    return matchesQuery && matchesCategory;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600">Knowledge Base</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Temukan solusi lebih cepat
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Cari dokumentasi dari permasalahan yang pernah ditangani oleh tim support.
            </p>
          </div>
          <Link
            href="/add-case"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tambah case
          </Link>
        </header>

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, masalah, atau solusi..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400"
              />
            </label>
            <label className="relative min-w-52">
              <SlidersHorizontal className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none"
              >
                {filterCategories.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
            </label>
          </div>
        </section>

        <div className="mt-7 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Daftar case</h2>
          {!loading && !error && (
            <p className="text-sm text-slate-500">{filteredCases.length} solusi ditemukan</p>
          )}
        </div>

        {!loading && !hasSupabaseConfig(config) && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Supabase belum dikonfigurasi. Tambahkan environment variable Supabase untuk menampilkan knowledge base.
          </div>
        )}

        {loading ? (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="font-medium text-red-800">Case belum dapat dimuat</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="mt-5 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-semibold text-slate-900">Solusi belum ditemukan</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Coba kata kunci atau kategori lain, atau tanyakan masalahmu melalui AI Support.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCases.map((caseItem) => (
              <CaseCard key={caseItem.id} caseItem={caseItem} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
