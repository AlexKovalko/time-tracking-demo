import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppChrome } from "@/components/AppChrome";
import { EmployeesSection } from "@/components/EmployeesSection";
import { EntriesSection } from "@/components/EntriesSection";
import { ReportSection } from "@/components/ReportSection";
import { TimerSection } from "@/components/TimerSection";

function AppLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <AppChrome />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 pb-32">
        <Routes>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          <Route path="/employees" element={<EmployeesSection />} />
          <Route path="/entries" element={<EntriesSection />} />
          <Route path="/report" element={<ReportSection />} />
          <Route path="*" element={<Navigate to="/employees" replace />} />
        </Routes>
      </main>
      <TimerSection />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
