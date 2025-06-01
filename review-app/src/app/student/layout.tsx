'use client';

import { OnboardingProvider } from '@/components/onboarding/onboarding-context';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <OnboardingProvider>
      {children}
    </OnboardingProvider>
  );
}
