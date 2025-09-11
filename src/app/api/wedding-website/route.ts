import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: website, error } = await supabase
      .from('wedding_websites')
      .select(
        `
        *,
        wedding_stories (
          id,
          title,
          content,
          date,
          image_url,
          order_index
        ),
        wedding_party_members (
          id,
          name,
          role,
          bio,
          image_url,
          order_index
        ),
        registry_links (
          id,
          name,
          url,
          logo_url,
          description,
          order_index
        ),
        travel_info (
          id,
          title,
          description,
          address,
          map_url,
          category,
          website_url,
          phone,
          order_index
        ),
        website_content (
          hero_title,
          hero_subtitle,
          hero_image,
          hero_date,
          welcome_message,
          venue_name,
          venue_address,
          ceremony_time,
          reception_time,
          dress_code,
          additional_info
        )
      `,
      )
      .eq('client_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return NextResponse.json({ website });
  } catch (error) {
    console.error('Error fetching wedding website:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wedding website' },
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
    const {
      slug,
      template_id,
      is_password_protected,
      password,
      primary_language,
      supported_languages,
      seo_title,
      seo_description,
      seo_keywords,
      content,
    } = body;

    let passwordHash = null;
    if (is_password_protected && password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const { data: website, error: websiteError } = await supabase
      .from('wedding_websites')
      .insert({
        client_id: user.id,
        slug,
        template_id: template_id || 'default',
        is_password_protected,
        password_hash: passwordHash,
        primary_language: primary_language || 'en',
        supported_languages: supported_languages || ['en'],
        seo_title,
        seo_description,
        seo_keywords,
        is_published: false,
      })
      .select()
      .single();

    if (websiteError) {
      throw websiteError;
    }

    if (content) {
      const { error: contentError } = await supabase
        .from('website_content')
        .insert({
          website_id: website.id,
          ...content,
        });

      if (contentError) {
        throw contentError;
      }
    }

    return NextResponse.json({ website }, { status: 201 });
  } catch (error) {
    console.error('Error creating wedding website:', error);
    return NextResponse.json(
      { error: 'Failed to create wedding website' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { id, password, ...updates } = body;

    let updateData: any = { ...updates };

    if (updates.is_password_protected && password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    } else if (!updates.is_password_protected) {
      updateData.password_hash = null;
    }

    const { data: website, error } = await supabase
      .from('wedding_websites')
      .update(updateData)
      .eq('id', id)
      .eq('client_id', user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ website });
  } catch (error) {
    console.error('Error updating wedding website:', error);
    return NextResponse.json(
      { error: 'Failed to update wedding website' },
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Website ID required' },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('wedding_websites')
      .delete()
      .eq('id', id)
      .eq('client_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wedding website:', error);
    return NextResponse.json(
      { error: 'Failed to delete wedding website' },
      { status: 500 },
    );
  }
}
