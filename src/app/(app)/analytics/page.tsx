
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Activity, Clock, TrendingUp, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import { useAuth } from "@/hooks/use-auth";

// Default mock data for charts if no user data is available
const defaultStudyTimeData = [
  { day: "Mon", hours: 0 }, { day: "Tue", hours: 0 }, { day: "Wed", hours: 0 },
  { day: "Thu", hours: 0 }, { day: "Fri", hours: 0 }, { day: "Sat", hours: 0 }, { day: "Sun", hours: 0 },
];
const defaultSubjectProgressData: { name: string; value: number; fill: string }[] = [
    { name: "No Data", value: 100, fill: "hsl(var(--muted))" },
];

const studyTimeConfigBase = { hours: { label: "Study Hours", color: "hsl(var(--primary))" } } satisfies ChartConfig;


export default function AnalyticsPage() {
  const { userProfile, loading } = useAuth();

  if (loading && !userProfile) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const studyTimeData = userProfile?.studyData?.weeklyStudyHours && userProfile.studyData.weeklyStudyHours.length > 0
    ? userProfile.studyData.weeklyStudyHours
    : defaultStudyTimeData;
  
  const studyTimeConfig = studyTimeConfigBase;

  const subjectProgressDataRaw = userProfile?.studyData?.subjects || [];
  const subjectProgressData = subjectProgressDataRaw.length > 0 
    ? subjectProgressDataRaw.map((subject, index) => ({
        name: subject.name,
        value: subject.progress,
        fill: `hsl(var(--chart-${(index % 5) + 1}))` // Cycle through 5 chart colors
      }))
    : defaultSubjectProgressData;

  const subjectProgressConfig = Object.fromEntries(
    subjectProgressData.map(({ name, fill }) => [name, { label: name, color: fill }])
  ) satisfies ChartConfig;


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Smart Study Analytics
          </CardTitle>
          <CardDescription className="text-lg">
            Track your progress, monitor learning patterns, and optimize your study efficiency.
            {(subjectProgressDataRaw.length === 0 && studyTimeData === defaultStudyTimeData) && " (Showing placeholder data as no activity is recorded yet)"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Activity className="mr-2 h-5 w-5 text-accent" /> Weekly Study Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={studyTimeConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={studyTimeData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="hours" stroke="var(--color-hours)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            {studyTimeData === defaultStudyTimeData && <p className="text-xs text-muted-foreground mt-2 text-center">Log study sessions to see your weekly hours.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-accent" /> Subject Progress</CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={subjectProgressConfig} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={subjectProgressData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label >
                             {subjectProgressData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        {subjectProgressDataRaw.length > 0 && <ChartLegend content={<ChartLegendContent nameKey="name"/>} />}
                    </PieChart>
                </ResponsiveContainer>
             </ChartContainer>
              {subjectProgressDataRaw.length === 0 && <p className="text-xs text-muted-foreground mt-2 text-center">Complete lessons or quizzes to see your subject progress.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
