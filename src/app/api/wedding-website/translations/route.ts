import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');
    const language = searchParams.get('language');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID is required' },
        { status: 400 },
      );
    }

    let query = supabase
      .from('website_translations')
      .select('*')
      .eq('website_id', websiteId);

    if (language) {
      query = query.eq('language_code', language);
    }

    const { data: translations, error } = await query;

    if (error) {
      throw error;
    }

    const translationMap: Record<string, Record<string, string>> = {};
    translations?.forEach((t) => {
      if (!translationMap[t.language_code]) {
        translationMap[t.language_code] = {};
      }
      translationMap[t.language_code][t.field_key] = t.translation;
    });

    return NextResponse.json({ translations: translationMap });
  } catch (error) {
    console.error('Error fetching translations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch translations' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, languageCode, translations } = body;

    if (!websiteId || !languageCode || !translations) {
      return NextResponse.json(
        { error: 'Website ID, language code, and translations are required' },
        { status: 400 },
      );
    }

    const { data: website, error: websiteError } = await supabase
      .from('wedding_websites')
      .select('client_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || website.client_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const translationRecords = Object.entries(translations).map(
      ([key, value]) => ({
        website_id: websiteId,
        language_code: languageCode,
        field_key: key,
        translation: value as string,
      }),
    );

    const { error: deleteError } = await supabase
      .from('website_translations')
      .delete()
      .eq('website_id', websiteId)
      .eq('language_code', languageCode);

    if (deleteError) {
      throw deleteError;
    }

    const { data, error } = await supabase
      .from('website_translations')
      .insert(translationRecords)
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({ translations: data }, { status: 201 });
  } catch (error) {
    console.error('Error saving translations:', error);
    return NextResponse.json(
      { error: 'Failed to save translations' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');
    const languageCode = searchParams.get('languageCode');

    if (!websiteId || !languageCode) {
      return NextResponse.json(
        { error: 'Website ID and language code are required' },
        { status: 400 },
      );
    }

    const { data: website, error: websiteError } = await supabase
      .from('wedding_websites')
      .select('client_id')
      .eq('id', websiteId)
      .single();

    if (websiteError || website.client_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('website_translations')
      .delete()
      .eq('website_id', websiteId)
      .eq('language_code', languageCode);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting translations:', error);
    return NextResponse.json(
      { error: 'Failed to delete translations' },
      { status: 500 },
    );
  }
}
