import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, DeductionCategory } from "@/lib/deduction-data";

interface Props {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterCategory: DeductionCategory | "all";
  onFilterChange: (c: DeductionCategory | "all") => void;
}

export function DeductionFilters({ searchQuery, onSearchChange, filterCategory, onFilterChange }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search deductions..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={filterCategory} onValueChange={(v) => onFilterChange(v as DeductionCategory | "all")}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
