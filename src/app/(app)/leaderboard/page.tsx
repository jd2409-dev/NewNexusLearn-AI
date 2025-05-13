
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Award, ShieldAlert } from "lucide-react";
import Image from "next/image";
// import { useAuth } from "@/hooks/use-auth"; // Not used yet as data is placeholder

// Mock data for leaderboard - replace with actual data fetching
const mockLeaderboardData = [
  { rank: 1, name: "Learner Alpha", xp: 10500, level: 10, avatarSeed: "alpha" },
  { rank: 2, name: "Student Beta", xp: 9800, level: 9, avatarSeed: "beta" },
  { rank: 3, name: "Scholar Gamma", xp: 9200, level: 9, avatarSeed: "gamma" },
  { rank: 4, name: "Prodigy Delta", xp: 8500, level: 8, avatarSeed: "delta" },
  { rank: 5, name: "Master Epsilon", xp: 7800, level: 7, avatarSeed: "epsilon" },
  { rank: 6, name: "User A", xp: 7200, level: 7, avatarSeed: "user_a" },
  { rank: 7, name: "User B", xp: 6500, level: 6, avatarSeed: "user_b" },
  { rank: 8, name: "User C", xp: 5800, level: 5, avatarSeed: "user_c" },
  { rank: 9, name: "User D", xp: 5200, level: 5, avatarSeed: "user_d" },
  { rank: 10, name: "User E", xp: 4800, level: 4, avatarSeed: "user_e" },
];


export default function LeaderboardPage() {
  // const { userProfile, loading } = useAuth(); // For fetching current user's rank in future

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <Users className="mr-3 h-8 w-8 text-primary" /> Global Study Leaderboard
          </CardTitle>
          <CardDescription className="text-lg">
            See how you rank against other learners worldwide. Keep studying to climb the ranks! (Placeholder Data)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Learner</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">XP</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Level</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {mockLeaderboardData.map((learner) => (
                  <tr key={learner.rank} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {learner.rank === 1 && <Award className="inline-block h-5 w-5 text-yellow-500 mr-1" />}
                      {learner.rank === 2 && <Award className="inline-block h-5 w-5 text-gray-400 mr-1" />}
                      {learner.rank === 3 && <Award className="inline-block h-5 w-5 text-orange-400 mr-1" />}
                      {learner.rank}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="flex items-center">
                        <Image 
                            src={`https://picsum.photos/seed/${learner.avatarSeed}/40/40`} 
                            alt={`${learner.name}'s avatar`} 
                            width={32} 
                            height={32} 
                            className="h-8 w-8 rounded-full mr-3"
                            data-ai-hint="user avatar" 
                        />
                        {learner.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{learner.xp.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{learner.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
           <p className="text-xs text-muted-foreground mt-4 text-center">
            Leaderboard data is currently placeholder. Full functionality coming soon.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-accent"/> Study Challenges (Coming Soon)</CardTitle>
            <CardDescription>AI-generated subject-based timed study challenges to boost your motivation and skills.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <Image src="https://picsum.photos/600/250?random=challenges" data-ai-hint="challenge competition" alt="Study challenges placeholder" width={600} height={250} className="rounded-md mx-auto shadow-md object-cover" />
            <p className="mt-4 text-muted-foreground">This feature is under development. Stay tuned for exciting challenges!</p>
        </CardContent>
      </Card>

    </div>
  );
}
