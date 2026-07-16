export type CaseItem = {
  id: string | number;
  title: string;
  category: string | null;
  module_name: string | null;
  menu_name: string | null;
  error_description: string;
  error_image_url: string | null;
  solution: string;
  created_by_id: string | null;
  created_by_email: string | null;
  created_at: string;
};

export type EditableCase = Pick<
  CaseItem,
  'id' | 'title' | 'error_description' | 'solution'
> & {
  category: string;
  module_name: string;
  menu_name: string;
  error_image_url: string;
};

export const CASE_SELECT =
  'id,title,category,module_name,menu_name,error_description,error_image_url,solution,created_by_id,created_by_email,created_at';

export const CASE_CATEGORIES = [
  'Akademik',
  'Keuangan',
  'PMB',
  'Pelaporan',
  'Karir Link',
  'Lain-lain',
] as const;

export function formatCaseDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
