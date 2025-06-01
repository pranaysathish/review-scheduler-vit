'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface OnboardingState {
  hasJoinedClassroom: boolean;
  hasJoinedTeam: boolean;
  hasScheduledReview: boolean;
  isOnboardingComplete: boolean;
  isFirstVisit: boolean;
  showWelcomeScreen: boolean;
  markClassroomJoined: () => void;
  markTeamJoined: () => void;
  markReviewScheduled: () => void;
  completeOnboarding: () => void;
  dismissWelcomeScreen: () => void;
}

const OnboardingContext = createContext<OnboardingState | undefined>(undefined);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [hasJoinedClassroom, setHasJoinedClassroom] = useState(false);
  const [hasJoinedTeam, setHasJoinedTeam] = useState(false);
  const [hasScheduledReview, setHasScheduledReview] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClientComponentClient();
  
  // Check onboarding status on component mount
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        setIsLoading(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return;
        }
        
        // Check if user has onboarding data
        const { data: onboardingData, error } = await supabase
          .from('user_onboarding')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error || !onboardingData) {
          // No onboarding data found, this is likely a first visit
          setIsFirstVisit(true);
          setShowWelcomeScreen(true);
          
          // Create onboarding record
          await supabase.from('user_onboarding').insert({
            user_id: user.id,
            has_joined_classroom: false,
            has_joined_team: false,
            has_scheduled_review: false,
            is_onboarding_complete: false,
            first_visit_date: new Date().toISOString()
          });
        } else {
          // Set states based on existing onboarding data
          setHasJoinedClassroom(onboardingData.has_joined_classroom);
          setHasJoinedTeam(onboardingData.has_joined_team);
          setHasScheduledReview(onboardingData.has_scheduled_review);
          setIsOnboardingComplete(onboardingData.is_onboarding_complete);
          
          // Only show welcome screen if onboarding is not complete
          setShowWelcomeScreen(!onboardingData.is_onboarding_complete);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkOnboardingStatus();
  }, []);
  
  // Update onboarding status in the database
  const updateOnboardingStatus = async (updates: Partial<{
    has_joined_classroom: boolean;
    has_joined_team: boolean;
    has_scheduled_review: boolean;
    is_onboarding_complete: boolean;
  }>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;
      
      await supabase
        .from('user_onboarding')
        .update(updates)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating onboarding status:', error);
    }
  };
  
  const markClassroomJoined = () => {
    setHasJoinedClassroom(true);
    updateOnboardingStatus({ has_joined_classroom: true });
  };
  
  const markTeamJoined = () => {
    setHasJoinedTeam(true);
    updateOnboardingStatus({ has_joined_team: true });
  };
  
  const markReviewScheduled = () => {
    setHasScheduledReview(true);
    updateOnboardingStatus({ has_scheduled_review: true });
  };
  
  const completeOnboarding = () => {
    setIsOnboardingComplete(true);
    updateOnboardingStatus({ is_onboarding_complete: true });
  };
  
  const dismissWelcomeScreen = () => {
    setShowWelcomeScreen(false);
  };
  
  const value = {
    hasJoinedClassroom,
    hasJoinedTeam,
    hasScheduledReview,
    isOnboardingComplete,
    isFirstVisit,
    showWelcomeScreen,
    markClassroomJoined,
    markTeamJoined,
    markReviewScheduled,
    completeOnboarding,
    dismissWelcomeScreen
  };
  
  return (
    <OnboardingContext.Provider value={value}>
      {!isLoading && children}
    </OnboardingContext.Provider>
  );
}
