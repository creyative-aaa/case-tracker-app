'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, FileQuestion, ImageIcon } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { CASE_SELECT, type CaseItem, formatCaseDate } from '@/lib/cases';
import {
  createClient,
  hasSupabaseConfig,
  loadSupabaseConfig,
  type SupabaseRuntimeConfig,
} from '@/lib/supabase';

export function CaseDetail({ caseId }: { caseId: string }) {
  const [config, setConfig] = useState<SupabaseRuntimeConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [caseItem, setCaseItem] = useState<CaseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      queueMicrotask(() => setLoading(false));
      return;
    }

    const fetchCase = async () => {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('cases')
        .select(CASE_SELECT)
        .eq('id', caseId)
        .maybeSingle();

      if (queryError) setError(queryError.message);
      else setCaseItem((data as CaseItem | null) ?? null);
      setLoading(false);
    };

    fetchCase();
  }, [caseId, configLoading, supabase]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke knowledge base
        </Link>

        {loading || configLoading ? (
          <div className="mt-7 space-y-5">
            <div className="h-44 animate-pulse rounded-xl border border-slate-200 bg-white" />
            <div className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white" />
          </div>
        ) : !hasSupabaseConfig(config) ? (
          <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Supabase belum dikonfigurasi.</div>
        ) : error ? (
          <div className="mt-7 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        ) : !caseItem ? (
          <div className="mt-7 flex min-h-96 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-slate-500"><FileQuestion className="h-5 w-5" /></div>
            <h1 className="mt-4 text-lg font-semibold">Case tidak ditemukan</h1>
            <p className="mt-2 text-sm text-slate-500">Case mungkin sudah tidak tersedia atau URL yang dibuka tidak valid.</p>
            <Link href="/" className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">Buka knowledge base</Link>
          </div>
        ) : (
          <article className="mt-7">
            <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{caseItem.category ?? 'Lain-lain'}</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{formatCaseDate(caseItem.created_at)}</span>
              </div>
              <h1 className="mt-5 max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">{caseItem.title}</h1>
              <p className="mt-3 text-sm text-slate-500">Dokumentasi solusi dari Knowledge Base ALDI Support</p>
              {(caseItem.module_name || caseItem.menu_name) && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lokasi di sistem</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
                    {caseItem.module_name && <span>{caseItem.module_name}</span>}
                    {caseItem.module_name && caseItem.menu_name && <span className="text-slate-400">/</span>}
                    {caseItem.menu_name && <span>{caseItem.menu_name}</span>}
                  </div>
                </div>
              )}
            </header>

            <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
              <div className="space-y-5">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">Deskripsi masalah</h2>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">{caseItem.error_description}</div>
                </section>
                <section className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-blue-700"><CheckCircle2 className="h-5 w-5" /><h2 className="text-base font-semibold">Solusi</h2></div>
                  <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{caseItem.solution}</div>
                </section>
              </div>

              <aside className="lg:order-none">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  {caseItem.error_image_url ? (
                    <a href={caseItem.error_image_url} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={caseItem.error_image_url} alt={`Screenshot error untuk ${caseItem.title}`} className="max-h-[480px] w-full object-cover" />
                    </a>
                  ) : (
                    <div className="flex min-h-52 flex-col items-center justify-center bg-slate-50 p-6 text-center text-slate-400">
                      <ImageIcon className="h-7 w-7" />
                      <p className="mt-2 text-xs">Screenshot tidak tersedia</p>
                    </div>
                  )}
                  <div className="border-t border-slate-100 p-4 text-xs leading-5 text-slate-500">Klik gambar untuk membuka ukuran penuh.</div>
                </div>
              </aside>
            </div>
          </article>
        )}
      </div>
    </AppShell>
  );
}
