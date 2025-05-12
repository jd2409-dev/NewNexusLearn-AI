import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Atom, Zap, Brain } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { NexusLearnLogo } from "@/components/icons/nexuslearn-logo";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 sm:p-8 text-center">
      <header className="mb-12">
        <NexusLearnLogo className="h-20 w-auto mx-auto text-primary" />
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          NexusLearn AI
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
          Unlock your academic potential with personalized, AI-driven learning paths, exam preparation, and smart study tools.
        </p>
      </header>

      <main className="w-full max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon={<Brain className="h-8 w-8 text-primary" />}
            title="Personalized Learning"
            description="AI crafts study plans tailored to your board and learning style."
          />
          <FeatureCard
            icon={<Zap className="h-8 w-8 text-primary" />}
            title="Smart Exam Prep"
            description="Simulate exams, identify weak spots, and get AI coaching."
          />
          <FeatureCard
            icon={<Atom className="h-8 w-8 text-primary" />}
            title="Intelligent Tools"
            description="Scan textbooks, generate summaries, and get instant help."
          />
        </div>
        
        <Image 
          src="https://picsum.photos/1200/600?random=1" 
          alt="Abstract learning visual"
          data-ai-hint="technology education"
          width={1200}
          height={600}
          className="rounded-xl shadow-2xl mb-12 object-cover aspect-video"
        />

        <Link href="/dashboard">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Get Started
            <Zap className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </main>

      <footer className="mt-16 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} NexusLearn AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-lg hover:shadow-primary/20 transition-shadow duration-300">
      <CardHeader className="items-center">
        {icon}
        <CardTitle className="mt-2 text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
