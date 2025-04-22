'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Users, Calendar, FileText, School, Clock } from 'lucide-react';

interface Activity {
  id: number;
  activity_type: string;
  entity_id: number;
  entity_name: string;
  details: any;
  created_at: string;
}

interface ActivityFeedProps {
  userRole: 'faculty' | 'student';
  limit?: number;
}

export default function ActivityFeed({ userRole, limit = 5 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          throw new Error('User not found');
        }

        // Get user details from the database
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('supabase_user_id', currentUser.id)
          .single();

        if (userError) {
          throw userError;
        }

        // Get activities
        let query = supabase
          .from('activities')
          .select(`
            id,
            activity_type,
            entity_id,
            entity_name,
            details,
            created_at,
            users:user_id(name)
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (userRole === 'faculty') {
          // For faculty, get activities related to their classrooms
          query = query.or(`user_id.eq.${userData.id},activity_type.eq.classroom_created`);
        } else {
          // For students, get only their activities
          query = query.eq('user_id', userData.id);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setActivities(data || []);
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [supabase, userRole, limit]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'classroom_created':
      case 'classroom_joined':
        return <School size={16} className="text-indigo-400" />;
      case 'team_created':
      case 'team_joined':
        return <Users size={16} className="text-purple-400" />;
      case 'slots_published':
        return <Calendar size={16} className="text-emerald-400" />;
      case 'submission_created':
        return <FileText size={16} className="text-amber-400" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getActivityText = (activity: Activity) => {
    const userName = activity.users?.name || 'You';
    const isCurrentUser = !activity.users; // If users is null, it's the current user's activity
    
    switch (activity.activity_type) {
      case 'classroom_created':
        return (
          <>
            {isCurrentUser ? 'You' : userName} created a new classroom{' '}
            <span className="text-indigo-400">{activity.entity_name}</span>
          </>
        );
      case 'classroom_joined':
        return (
          <>
            {isCurrentUser ? 'You' : userName} joined classroom{' '}
            <span className="text-indigo-400">{activity.entity_name}</span>
          </>
        );
      case 'team_created':
        return (
          <>
            {isCurrentUser ? 'You' : userName} created team{' '}
            <span className="text-purple-400">{activity.entity_name}</span>
            {activity.details?.classroom_name && (
              <> in {activity.details.classroom_name}</>
            )}
          </>
        );
      case 'team_joined':
        return (
          <>
            {isCurrentUser ? 'You' : userName} joined team{' '}
            <span className="text-purple-400">{activity.entity_name}</span>
            {activity.details?.classroom_name && (
              <> in {activity.details.classroom_name}</>
            )}
          </>
        );
      case 'slots_published':
        return (
          <>
            {isCurrentUser ? 'You' : userName} published{' '}
            <span className="text-emerald-400">{activity.details?.count || 0} review slots</span>
            {activity.entity_name && <> for {activity.entity_name}</>}
          </>
        );
      case 'submission_created':
        return (
          <>
            {isCurrentUser ? 'You' : userName} submitted{' '}
            {activity.details?.review_stage && (
              <span className="text-amber-400">{activity.details.review_stage}</span>
            )}
            {activity.entity_name && <> for team {activity.entity_name}</>}
          </>
        );
      default:
        return (
          <>
            {isCurrentUser ? 'You' : userName} performed an action
          </>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'some time ago';
      }
      
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      
      if (seconds < 0) {
        return 'just now';
      }
      
      let interval = Math.floor(seconds / 31536000);
      if (interval >= 1) {
        return interval === 1 ? '1 year ago' : `${interval} years ago`;
      }
      
      interval = Math.floor(seconds / 2592000);
      if (interval >= 1) {
        return interval === 1 ? '1 month ago' : `${interval} months ago`;
      }
      
      interval = Math.floor(seconds / 86400);
      if (interval >= 1) {
        return interval === 1 ? '1 day ago' : `${interval} days ago`;
      }
      
      interval = Math.floor(seconds / 3600);
      if (interval >= 1) {
        return interval === 1 ? '1 hour ago' : `${interval} hours ago`;
      }
      
      interval = Math.floor(seconds / 60);
      if (interval >= 1) {
        return interval === 1 ? '1 minute ago' : `${interval} minutes ago`;
      }
      
      return seconds <= 5 ? 'just now' : `${Math.floor(seconds)} seconds ago`;
    } catch (e) {
      return 'some time ago';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="p-2 bg-gray-800 rounded-lg mt-1 w-8 h-8"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-800 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center py-6 text-gray-500">
          <Clock size={24} className="mx-auto mb-2" />
          <p>No recent activity</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="space-y-6">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4">
            <div className="p-2 bg-gray-800/50 rounded-lg mt-1">
              {getActivityIcon(activity.activity_type)}
            </div>
            <div>
              <p className="text-sm">{getActivityText(activity)}</p>
              <p className="text-gray-500 text-xs mt-1">{formatTime(activity.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
