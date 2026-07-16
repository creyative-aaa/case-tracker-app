import { createGoogle } from '@ai-sdk/google';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { createClient } from '@/lib/supabase';

function getChatErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (
      error.message.toLowerCase().includes('api key') ||
      error.message.toLowerCase().includes('api_key') ||
      error.message.toLowerCase().includes('unauthorized')
    ) {
      return 'Google Gemini API key tidak valid. Ganti GOOGLE_GENERATIVE_AI_API_KEY di .env.local dengan API key dari Google AI Studio.';
    }

    return error.message;
  }

  return 'Chat gagal diproses. Cek konfigurasi Google Gemini dan Supabase.';
}

export async function POST(request: Request) {
  const userGoogleApiKey = request.headers.get('x-google-api-key')?.trim();
  const authorization = request.headers.get('authorization');
  const accessToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length)
    : '';

  if (!accessToken) {
    return new Response('Login Google diperlukan untuk memakai AI chat.', {
      status: 401,
    });
  }

  if (!userGoogleApiKey) {
    return new Response(
      'Gemini API key belum disimpan di profil login kamu.',
      { status: 400 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await request.json();
  const google = createGoogle({ apiKey: userGoogleApiKey });
  const supabase = createClient();
  let context = '';

  if (supabase) {
    const { error: authError } = await supabase.auth.getUser(accessToken);

    if (authError) {
      return new Response('Sesi login tidak valid. Login ulang dulu.', {
        status: 401,
      });
    }

    const { data } = await supabase
      .from('cases')
      .select(
        'title,category,module_name,menu_name,error_description,error_image_url,solution,created_by_email',
      )
      .order('created_at', { ascending: false })
      .limit(20);

    context =
      data
        ?.map(
          (item) =>
            `Judul: ${item.title}\nKategori: ${item.category ?? '-'}\nModul: ${item.module_name ?? '-'}\nMenu: ${item.menu_name ?? '-'}\nUploader: ${item.created_by_email ?? '-'}\nError: ${item.error_description}\nGambar Error: ${item.error_image_url ?? '-'}\nSolusi: ${item.solution}`,
        )
        .join('\n\n') ?? '';
  }

  const result = streamText({
    model: google('gemini-3.5-flash'),
    system: `Anda adalah IT Support AI Agent. Jawab dalam Bahasa Indonesia berdasarkan knowledge base berikut jika relevan.\n\n${context}`,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse({
    onError: getChatErrorMessage,
  });
}
