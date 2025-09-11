/**
 * NextAuth route - DISABLED (using Supabase Auth instead)
 * This file exists to prevent build errors but auth is handled by Supabase
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'NextAuth disabled - using Supabase Auth',
      redirect: '/auth/login',
    },
    { status: 404 },
  );
}

export async function POST(req: NextRequest) {
  return NextResponse.json(
    {
      error: 'NextAuth disabled - using Supabase Auth',
      redirect: '/auth/login',
    },
    { status: 404 },
  );
}
