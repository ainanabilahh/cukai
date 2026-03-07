import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Receipt, TrendingUp, Layers } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StorageSettings } from "@/components/StorageSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDeductions } from "@/hooks/useDeductions";
import { useFileStorageContext } from "@/contexts/FileStorageContext";
import { AddDeductionDialog } from "@/components/AddDeductionDialog";
import { DeductionList } from "@/components/DeductionList";
import { DeductionFilters } from "@/components/DeductionFilters";
import { CategoryBreakdown } from "@/components/CategoryBreakdown";
import { EAFormSection } from "@/components/EAFormSection";
import { DashboardCharts } from "@/components/DashboardCharts";
import { TaxCalculator } from "@/components/TaxCalculator";
import { BEFormSection } from "@/components/BEFormSection";
import { DataImportExport } from "@/components/DataImportExport";
import { PrintSummary } from "@/components/PrintSummary";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

const Index = () => {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const fileStorage = useFileStorageContext();
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

  const handleYearChange = (year: string) => {
    const y = parseInt(year);
    setSelectedYear(y);
    switchYear(y);
  };

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
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Year of Assessment</p>
                <Select value={selectedYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="h-6 w-[80px] text-xs border-none bg-transparent px-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StorageSettings
              isSupported={fileStorage.isSupported}
              isReady={fileStorage.isReady}
              directoryName={fileStorage.directoryName}
              onPickDirectory={fileStorage.pickDirectory}
              onChangeDirectory={fileStorage.changeDirectory}
              onClearDirectory={fileStorage.clearDirectory}
            />
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
          </div>
        </div>

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


        {/* Forms */}
        <div className="grid gap-6 lg:grid-cols-2">
          <EAFormSection />
          <BEFormSection year={selectedYear} />
        </div>

        {/* Tax Calculator */}
        <TaxCalculator totalDeductions={total} zakatAmount={zakatAmount} />


        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Deduction List</CardTitle>
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
                  onAttachReceipt={(id, fileName) => updateDeduction(id, { receiptImage: fileName })}
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
