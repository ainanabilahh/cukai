import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StorageSettings } from "@/components/StorageSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeductions } from "@/hooks/useDeductions";
import { AddDeductionDialog } from "@/components/AddDeductionDialog";
import { DeductionList } from "@/components/DeductionList";
import { DeductionFilters } from "@/components/DeductionFilters";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { EAFormSection } from "@/components/EAFormSection";

import { TaxCalculator } from "@/components/TaxCalculator";
import { BEFormSection } from "@/components/BEFormSection";
import { DataImportExport } from "@/components/DataImportExport";
import { PrintSummary } from "@/components/PrintSummary";
import { useTaxRates } from "@/contexts/TaxRatesContext";
import { capReliefs } from "@/lib/tax-rates";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

const Index = () => {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const {
    deductions,
    filteredDeductions,
    addDeduction,
    importDeductions,
    checkDuplicate,
    updateDeduction,
    deleteDeduction,
    total,
    totalByCategory,
    categoryData,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    switchYear,
  } = useDeductions(selectedYear);

  const categoryCount = Object.keys(totalByCategory).length;
  const zakatAmount = totalByCategory["Zakat"] || 0;
  const rates = useTaxRates(selectedYear);
  const reliefs = useMemo(() => capReliefs(totalByCategory, rates.limits, rates.shared), [totalByCategory, rates.limits, rates.shared]);

  const handleYearChange = (year: string) => {
    const y = parseInt(year);
    setSelectedYear(y);
    switchYear(y);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Cukai</h1>
            <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
              <SelectTrigger className="h-7 w-auto gap-1 text-sm text-muted-foreground border-none bg-transparent px-1 shadow-none focus:ring-0">
                <span>YA</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <StorageSettings />
            <ThemeToggle />
            <AddDeductionDialog onAdd={addDeduction} checkDuplicate={checkDuplicate} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Action bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <DataImportExport deductions={deductions} year={selectedYear} onImport={importDeductions} />
            <PrintSummary deductions={deductions} totalByCategory={totalByCategory} total={total} year={selectedYear} />
            <Button variant="outline" className="gap-2" onClick={() => navigate(`/charts?year=${selectedYear}`)}>
              <BarChart3 className="h-4 w-4" />
              View Charts
            </Button>
          </div>
        </div>

        <dl className="grid grid-cols-3 divide-x rounded-lg border bg-card">
          <div className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">Total claimed</dt>
            <dd className="mt-1 text-xl font-semibold">RM {total.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">Receipts</dt>
            <dd className="mt-1 text-xl font-semibold">{deductions.length}</dd>
          </div>
          <div className="px-5 py-4">
            <dt className="text-xs text-muted-foreground">Categories</dt>
            <dd className="mt-1 text-xl font-semibold">{categoryCount}</dd>
          </div>
        </dl>


        {/* Forms */}
        <div className="grid gap-6 lg:grid-cols-2">
          <EAFormSection year={selectedYear} />
          <BEFormSection year={selectedYear} />
        </div>

        {/* Tax Calculator */}
        <TaxCalculator totalReliefs={reliefs.total} overLimit={reliefs.excess} zakatAmount={zakatAmount} rates={rates} />


        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Claim List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DeductionFilters
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filterCategory={filterCategory}
                  onFilterChange={setFilterCategory}
                />
                <DeductionList
                  deductions={filteredDeductions}
                  onDelete={deleteDeduction}
                  year={selectedYear}
                  onAttachReceipt={(id, fileName) => {
                    const existing = deductions.find(d => d.id === id);
                    const current = existing?.receiptImages || [];
                    updateDeduction(id, { receiptImages: [...current, fileName] });
                  }}
                />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <CategoryBreakdown totalByCategory={totalByCategory} limits={rates.limits} />
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
