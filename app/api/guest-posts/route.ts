import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { callAI } from '@/lib/ai-provider';

export const dynamic = 'force-dynamic';

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', pt: 'Portuguese',
  de: 'German', ar: 'Arabic', zh: 'Chinese', hi: 'Hindi',
  yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', sw: 'Swahili',
  ru: 'Russian', ja: 'Japanese', ko: 'Korean', tr: 'Turkish',
};

/** GET /api/guest-posts?lang=es&limit=20&offset=0 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient();
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get('lang') || 'en';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { data: posts, error, count } = await supabase
      .from('guest_posts')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json({ success: true, data: [], total: 0, message: 'Run migration 050.' });
      }
      throw error;
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ success: true, data: [], total: count || 0 });
    }

    // If requested language differs from original, fetch/generate translations
    if (lang !== 'en') {
      const postIds = posts.map(p => p.id);
      const { data: translations } = await supabase
        .from('guest_post_translations')
        .select('*')
        .in('post_id', postIds)
        .eq('lang', lang);

      const translationMap = new Map((translations || []).map(t => [t.post_id, t]));

      const result = await Promise.all(posts.map(async (post) => {
        const cached = translationMap.get(post.id);
        if (cached) {
          return { ...post, title: cached.title, body: cached.body, display_lang: lang };
        }

        // Generate translation on-the-fly and cache
        try {
          const langName = SUPPORTED_LANGUAGES[lang] || lang;
          const translatedTitle = await callAI({
            prompt: `Translate to ${langName}. Return ONLY the translation:\n${post.title}`,
            systemPrompt: 'You are a precise translator. Output only the translated text.',
            maxTokens: 200,
            temperature: 0.2,
          });
          const translatedBody = await callAI({
            prompt: `Translate to ${langName}. Return ONLY the translation:\n${post.body}`,
            systemPrompt: 'You are a precise translator. Output only the translated text.',
            maxTokens: 3000,
            temperature: 0.2,
          });

          if (translatedTitle && translatedBody) {
            // Cache the translation
            await supabase.from('guest_post_translations').upsert({
              post_id: post.id,
              lang,
              title: translatedTitle.trim(),
              body: translatedBody.trim(),
            }, { onConflict: 'post_id,lang' }).select();

            return { ...post, title: translatedTitle.trim(), body: translatedBody.trim(), display_lang: lang };
          }
        } catch (err) {
          console.warn(`[GuestPost] Translation to ${lang} failed for ${post.id}:`, err);
        }

        return { ...post, display_lang: post.original_lang };
      }));

      return NextResponse.json({ success: true, data: result, total: count || 0 });
    }

    return NextResponse.json({
      success: true,
      data: posts.map(p => ({ ...p, display_lang: p.original_lang })),
      total: count || 0,
    });
  } catch (error) {
    console.error('[GuestPost] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

/** POST /api/guest-posts — submit a new guest post */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, authorName, lang } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Title must be at least 3 characters.' }, { status: 400 });
    }
    if (!content || typeof content !== 'string' || content.trim().length < 20) {
      return NextResponse.json({ error: 'Content must be at least 20 characters.' }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ error: 'Title too long (max 200 chars).' }, { status: 400 });
    }
    if (content.length > 10000) {
      return NextResponse.json({ error: 'Content too long (max 10000 chars).' }, { status: 400 });
    }

    const originalLang = lang && SUPPORTED_LANGUAGES[lang] ? lang : 'en';
    const supabase = await createAdminClient();

    const { data: inserted, error } = await supabase
      .from('guest_posts')
      .insert({
        author_name: (authorName || 'Anonymous').slice(0, 50),
        title: title.trim(),
        body: content.trim(),
        original_lang: originalLang,
        status: 'published',
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('does not exist')) {
        return NextResponse.json({ error: 'Guest posts not yet enabled. Run migration 050.' }, { status: 503 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      id: inserted.id,
      message: 'Post published! It will be automatically translated for readers in other languages.',
    });
  } catch (error) {
    console.error('[GuestPost] Submit error:', error);
    return NextResponse.json({ error: 'Failed to submit post' }, { status: 500 });
  }
}
