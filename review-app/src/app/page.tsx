'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';
import { TextShimmer } from '@/components/ui/text-shimmer';

export default function Home() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Fetch user role
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('supabase_user_id', session.user.id)
          .single();
        
        if (userData?.role === 'faculty') {
          router.push('/faculty/dashboard');
        } else if (userData?.role === 'student') {
          router.push('/student/dashboard');
        }
      }
    };
    
    checkUser();
  }, [router, supabase]);

  return (
    <BackgroundGradientAnimation
      gradientBackgroundStart="rgb(0, 0, 0)" 
      gradientBackgroundEnd="rgb(9, 9, 23)"
      firstColor="18, 113, 255"
      secondColor="221, 74, 255"
      thirdColor="100, 220, 255"
      fourthColor="200, 50, 50"
      fifthColor="180, 180, 50"
      pointerColor="140, 100, 255"
      containerClassName="min-h-screen"
    >
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10"
          >
            <TextShimmer
              as="h1"
              duration={3}
              className="text-3xl font-bold mb-3 [--base-color:theme(colors.white)] [--base-gradient-color:theme(colors.blue.400)] drop-shadow-lg"
            >
              Welcome to VIT Review
            </TextShimmer>
            <TextShimmer
              as="p"
              duration={2.5}
              className="text-base [--base-color:theme(colors.gray.200)] [--base-gradient-color:theme(colors.blue.200)] drop-shadow-md"
            >
              Intelligent Schedule Management for Academic Excellence
            </TextShimmer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4 backdrop-blur-sm bg-black/20 p-6 rounded-xl border border-white/10 shadow-xl"
          >
            <div className="space-y-4">
              <Link 
                href="/login"
                className="block w-full text-center bg-white/90 text-black rounded-md py-3 px-4 font-medium transition-all hover:bg-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  Sign in with Email
                </div>
              </Link>
            </div>

            <div className="text-center mt-8">
              <p className="text-xs text-gray-300">
                By signing up, you agree to our <a href="#" className="underline">Terms of Use</a> and <a href="#" className="underline">Privacy Policy</a>
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="fixed bottom-4 text-center text-xs text-gray-300 z-20"
        >
          <div className="flex items-center justify-center space-x-1">
            <span>curated by</span>
            <span className="font-medium">VIT Chennai</span>
          </div>
        </motion.div>
      </div>
    </BackgroundGradientAnimation>
  );
}
