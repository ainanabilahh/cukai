import { Receipt, TrendingUp, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeductions } from "@/hooks/useDeductions";
import { AddDeductionDialog } from "@/components/AddDeductionDialog";
import { DeductionList } from "@/components/DeductionList";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { EAFormSection } from "@/components/EAFormSection";

const Index = () => {
  const { deductions, addDeduction, deleteDeduction, total, totalByCategory, categoryData } = useDeductions();

  const categoryCount = Object.keys(totalByCategory).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Receipt className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">Income Tax</h1>
              <p className="text-xs text-muted-foreground">Year of Assessment 2025</p>
            </div>
          </div>
          <AddDeductionDialog onAdd={addDeduction} />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deductions</p>
                <p className="font-display text-2xl font-bold">RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/20">
                <Receipt className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Receipts</p>
                <p className="font-display text-2xl font-bold">{deductions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Layers className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="font-display text-2xl font-bold">{categoryCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* EA Forms Section */}
        <EAFormSection />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Deduction List</CardTitle>
              </CardHeader>
              <CardContent>
                <DeductionList deductions={deductions} onDelete={deleteDeduction} />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBreakdown totalByCategory={totalByCategory} />
                {categoryData.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
