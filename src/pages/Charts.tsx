import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "@/components/DashboardCharts";
import { useDeductions } from "@/hooks/useDeductions";

const currentYear = new Date().getFullYear();

const ChartsPage = () => {
  const [searchParams] = useSearchParams();
  const year = Number(searchParams.get("year")) || currentYear;
  const { deductions, totalByCategory } = useDeductions(year);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-3 px-4 py-5">
          <Link to={`/?year=${year}`}>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-xl font-bold tracking-tight">Charts</h1>
            <p className="text-xs text-muted-foreground">Year of Assessment {year}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <DashboardCharts totalByCategory={totalByCategory} deductions={deductions} />
      </main>
    </div>
  );
};

export default ChartsPage;
