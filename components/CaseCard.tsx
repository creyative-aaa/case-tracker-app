import Link from 'next/link';
import { ArrowUpRight, CalendarDays, ImageIcon } from 'lucide-react';
import { type CaseItem, formatCaseDate } from '@/lib/cases';

export function CaseCard({ caseItem }: { caseItem: CaseItem }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-200 hover:shadow-md">
      <div className="relative aspect-[16/8] overflow-hidden bg-slate-100">
        {caseItem.error_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={caseItem.error_image_url}
            alt={`Screenshot error untuk ${caseItem.title}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
            {caseItem.category ?? 'Lain-lain'}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatCaseDate(caseItem.created_at)}
          </span>
        </div>

        <h2 className="line-clamp-2 text-base font-semibold leading-6 text-slate-900">
          {caseItem.title}
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">
          {caseItem.error_description}
        </p>

        {(caseItem.module_name || caseItem.menu_name) && (
          <p className="mt-3 truncate text-xs font-medium text-slate-500">
            {[caseItem.module_name, caseItem.menu_name].filter(Boolean).join(' · ')}
          </p>
        )}

        <Link
          href={`/cases/${caseItem.id}`}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          Lihat solusi
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
