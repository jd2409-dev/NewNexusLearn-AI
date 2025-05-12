"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpenText, ClipboardCheck, Lightbulb, Zap, BarChart3, UploadCloud, Brain } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--primary))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="bg-card p-8 rounded-lg shadow-lg">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="md:w-2/3">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Welcome to NexusLearn AI!
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Your personalized AI learning companion. Let's supercharge your studies today.
            </p>
            <div className="mt-6 flex gap-4">
              <Link href="/learning-paths">
                <Button size="lg">
                  <BookOpenText className="mr-2 h-5 w-5" /> Create Learning Path
                </Button>
              </Link>
              <Link href="/quizzes">
                <Button variant="outline" size="lg">
                  <Lightbulb className="mr-2 h-5 w-5" /> Start a Quiz
                </Button>
              </Link>
            </div>
          </div>
          <div className="md:w-1/3 flex justify-center">
            <Image 
              src="https://picsum.photos/300/300?random=dashboard" 
              alt="AI Learning Illustration"
              data-ai-hint="AI learning" 
              width={250} 
              height={250} 
              className="rounded-full shadow-2xl object-cover"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Textbook Analyzer"
            description="Scan PDFs, find answers, and generate summaries."
            icon={<UploadCloud className="h-8 w-8 text-primary" />}
            href="/textbook-analyzer"
            actionText="Analyze Now"
          />
          <DashboardCard
            title="Exam Preparation"
            description="Simulate exams and practice for specific boards."
            icon={<ClipboardCheck className="h-8 w-8 text-primary" />}
            href="/exam-prep"
            actionText="Prepare for Exam"
          />
          <DashboardCard
            title="AI Study Coach"
            description="Get real-time assistance and explanations."
            icon={<Brain className="h-8 w-8 text-primary" />}
            href="/ai-coach"
            actionText="Ask AI Coach"
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Your Progress Overview</h2>
        <Card>
          <CardHeader>
            <CardTitle>Study Activity (Last 6 Months)</CardTitle>
            <CardDescription>Hours spent on desktop vs. mobile (mock data)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                  <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
           <CardFooter className="flex-col items-start gap-2 text-sm">
            <div className="flex gap-2 font-medium leading-none">
              Trending up by 5.2% this month <Zap className="h-4 w-4" />
            </div>
            <div className="leading-none text-muted-foreground">
              Showing total study hours for the last 6 months
            </div>
          </CardFooter>
        </Card>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Overall Learning Journey</h2>
        <Card>
          <CardHeader>
            <CardTitle>Syllabus Coverage</CardTitle>
            <CardDescription>Your progress through the current study path.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Mathematics</span>
                <span>75%</span>
              </div>
              <Progress value={75} aria-label="Mathematics progress 75%" />
            </div>
            <div className="space-y-2 mt-4">
              <div className="flex justify-between">
                <span>Physics</span>
                <span>40%</span>
              </div>
              <Progress value={40} aria-label="Physics progress 40%" />
            </div>
          </CardContent>
           <CardFooter>
             <Link href="/analytics" className="w-full">
                <Button variant="outline" className="w-full">
                    <BarChart3 className="mr-2 h-4 w-4" /> View Detailed Analytics
                </Button>
             </Link>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  actionText: string;
}

function DashboardCard({ title, description, icon, href, actionText }: DashboardCardProps) {
  return (
    <Card className="hover:shadow-primary/10 transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
      <CardFooter>
        <Link href={href} className="w-full">
          <Button variant="secondary" className="w-full">{actionText}</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
