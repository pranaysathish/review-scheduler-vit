import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });

  // Get the user's session
  const { data: { session } } = await supabase.auth.getSession();

  // Get the pathname from the request
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/signup', '/verify', '/verify-email'];
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    // If user is already authenticated and tries to access auth pages, redirect to dashboard
    if (session) {
      // Fetch the user's role from the database
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('supabase_user_id', session.user.id)
        .single();

      if (user?.role === 'faculty') {
        return NextResponse.redirect(new URL('/faculty/dashboard', request.url));
      } else if (user?.role === 'student') {
        return NextResponse.redirect(new URL('/student/dashboard', request.url));
      }
    }
    return res;
  }

  // If there's no session, redirect to the login page
  if (!session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Fetch the user's role from the database
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('supabase_user_id', session.user.id)
    .single();

  // If there's no user or role, redirect to error page
  if (!user || !user.role) {
    return NextResponse.redirect(new URL('/auth-error?error=role-not-found', request.url));
  }

  // Role-based access control
  if (pathname.startsWith('/faculty') && user.role !== 'faculty') {
    return NextResponse.redirect(new URL('/auth-error?error=unauthorized-role', request.url));
  }
  
  if (pathname.startsWith('/student') && user.role !== 'student') {
    return NextResponse.redirect(new URL('/auth-error?error=unauthorized-role', request.url));
  }

  // Allow the request to proceed
  return res;
}

// Specify which paths this middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
