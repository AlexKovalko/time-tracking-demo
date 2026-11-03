import { AppChrome } from "@/components/AppChrome";
import { EmployeesSection } from "@/components/EmployeesSection";
import { ReportSection } from "@/components/ReportSection";
import { TimerSection } from "@/components/TimerSection";

export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppChrome />
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
        <EmployeesSection />
        <TimerSection />
        <ReportSection />
      </main>
    </div>
  );
}
