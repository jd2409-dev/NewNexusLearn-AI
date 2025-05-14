
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, Trophy, Star, Award, Flame, Milestone, Puzzle } from "lucide-react";
import type { Achievement } from "@/lib/user-service";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import React, { memo } from "react";

const achievementIcons: Record<string, React.ElementType> = {
    Trophy: Trophy,
    Star: Star,
    Award: Award,
    Flame: Flame,
    Milestone: Milestone,
    Puzzle: Puzzle,
    Default: Award, 
};

interface MemoizedAchievementCardProps {
  achievement: Achievement;
  formatDateFn: (timestamp: any) => string;
}

const MemoizedAchievementCard = memo(function AchievementCard({ achievement, formatDateFn }: MemoizedAchievementCardProps) {
  const IconComponent = achievementIcons[achievement.icon || 'Default'] || achievementIcons.Default;
  return (
    <Card className="flex flex-col items-center text-center p-6 hover:shadow-lg transition-shadow bg-card">
      <div className="p-4 bg-primary/10 rounded-full mb-4">
          <IconComponent className="h-12 w-12 text-primary" />
      </div>
      <CardTitle className="text-xl mb-1">{achievement.name}</CardTitle>
      <CardDescription className="text-sm mb-3 flex-grow">{achievement.description}</CardDescription>
      <Badge variant="secondary" className="text-xs">
          Earned: {formatDateFn(achievement.dateEarned)}
      </Badge>
    </Card>
  );
});
MemoizedAchievementCard.displayName = 'MemoizedAchievementCard';


export default function AchievementsPage() {
  const { userProfile, loading: authLoading } = useAuth();
  const achievements = userProfile?.studyData?.achievements || [];

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    if (timestamp.toDate) {
      return format(timestamp.toDate(), "PPP"); 
    }
    try {
       return format(new Date(timestamp), "PPP");
    } catch {
       return "Invalid Date";
    }
  };

  if (authLoading && !userProfile) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Trophy className="mr-3 h-8 w-8 text-primary" /> Your Achievements
          </CardTitle>
          <CardDescription className="text-lg">
            Track your accomplishments and milestones. Keep learning to unlock more!
          </CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 && !authLoading && (
            <div className="text-center py-10">
              <Star className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-xl">No achievements unlocked yet.</p>
              <p className="text-sm text-muted-foreground">Keep studying and completing activities to earn badges and trophies!</p>
            </div>
          )}
          {achievements.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {achievements
                .sort((a,b) => (b.dateEarned.toDate ? b.dateEarned.toDate() : new Date(b.dateEarned as any)).getTime() - (a.dateEarned.toDate ? a.dateEarned.toDate() : new Date(a.dateEarned as any)).getTime() )
                .map((ach: Achievement) => (
                  <MemoizedAchievementCard key={ach.id} achievement={ach} formatDateFn={formatDate} />
                ))}
            </div>
          )}
        </CardContent>
         {achievements.length > 0 && (
             <CardFooter>
                <p className="text-xs text-muted-foreground mx-auto">
                    Achievements are a great way to track your learning journey. Keep up the fantastic work!
                </p>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
