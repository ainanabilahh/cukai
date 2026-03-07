import { CATEGORY_LIMITS, DeductionCategory } from "@/lib/deduction-data";
import { Progress } from "@/components/ui/progress";

interface Props {
  totalByCategory: Record<string, number>;
}

export function CategoryBreakdown({ totalByCategory }: Props) {
  const entries = Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {entries.map(([cat, amount]) => {
        const limit = CATEGORY_LIMITS[cat as DeductionCategory];
        const pct = limit === Infinity ? 0 : Math.min((amount / limit) * 100, 100);
        const isOver = limit !== Infinity && amount > limit;

        return (
          <div key={cat} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{cat}</span>
              <span className={isOver ? "text-destructive font-semibold" : "text-muted-foreground"}>
                RM {amount.toLocaleString("ms-MY", { minimumFractionDigits: 2 })}
                {limit !== Infinity && (
                  <span className="text-muted-foreground font-normal"> / RM {limit.toLocaleString()}</span>
                )}
              </span>
            </div>
            {limit !== Infinity && (
              <Progress value={pct} className={`h-2 ${isOver ? "[&>div]:bg-destructive" : ""}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
