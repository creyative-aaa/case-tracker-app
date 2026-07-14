import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: Request) {
  const supabase = createClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase belum dikonfigurasi.' },
      { status: 500 },
    );
  }

  const body = await request.json();
  const {
    title,
    category,
    error_description,
    error_image_url,
    solution,
    resolution_steps,
    created_by_id,
    created_by_email,
  } = body;

  const resolvedSolution = solution ?? resolution_steps;

  if (!title || !category || !error_description || !resolvedSolution) {
    return NextResponse.json(
      {
        error:
          'title, category, error_description, dan solution wajib diisi.',
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('cases')
    .insert({
      title,
      category,
      error_description,
      error_image_url,
      solution: resolvedSolution,
      resolution_steps: resolvedSolution,
      created_by_id,
      created_by_email,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
