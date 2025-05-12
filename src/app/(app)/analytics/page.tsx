"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Activity, Clock, TrendingUp } from "lucide-react";
import Image from "next/image";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell, ResponsiveContainer } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"

const studyTimeData = [
  { day: "Mon", hours: 2 }, { day: "Tue", hours: 3 }, { day: "Wed", hours: 1.5 },
  { day: "Thu", hours: 4 }, { day: "Fri", hours: 2.5 }, { day: "Sat", hours: 5 }, { day: "Sun", hours: 1 },
];
const studyTimeConfig = { hours: { label: "Study Hours", color: "hsl(var(--primary))" } } satisfies ChartConfig;

const subjectProgressData = [
  { name: "Maths", value: 75, fill: "hsl(var(--chart-1))" },
  { name: "Physics", value: 60, fill: "hsl(var(--chart-2))" },
  { name: "Chemistry", value: 45, fill: "hsl(var(--chart-3))" },
  { name: "Biology", value: 80, fill: "hsl(var(--chart-4))" },
  { name: "English", value: 90, fill: "hsl(var(--chart-5))" },
];
const subjectProgressConfig = Object.fromEntries(
  subjectProgressData.map(({ name, fill }) => [name, { label: name, color: fill }])
) satisfies ChartConfig;


export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl flex items-center">
            <BarChart3 className="mr-3 h-8 w-8 text-primary" /> Smart Study Analytics
          </CardTitle>
          <CardDescription className="text-lg">
            Track your progress, monitor learning patterns, and optimize your study efficiency. (Placeholder data shown)
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
                        <Pie data={subjectProgressData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                             {subjectProgressData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="name"/>} />
                    </PieChart>
                </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Clock className="mr-2 h-5 w-5 text-accent" /> Study-Rest Cycle Suggestions (Coming Soon)</CardTitle>
          <CardDescription>AI will analyze your patterns to suggest optimal study and break times for better retention.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Image src="https://picsum.photos/600/250?random=cycle" data-ai-hint="time management schedule" alt="Study cycle placeholder" width={600} height={250} className="rounded-md mx-auto shadow-md object-cover" />
          <p className="mt-4 text-muted-foreground">This feature is in active development.</p>
        </CardContent>
      </Card>
    </div>
  );
}
