import { limitFor, sharedOverages, SharedLimit } from "@/lib/tax-rates";
import { Progress } from "@/components/ui/progress";

interface Props {
  totalByCategory: Record<string, number>;
  limits: Record<string, number>;
  shared?: SharedLimit[];
}

export function CategoryBreakdown({ totalByCategory, limits, shared = [] }: Props) {
  const overShared = sharedOverages(totalByCategory, limits, shared);
  const entries = Object.entries(totalByCategory).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {entries.map(([cat, amount]) => {
        const limit = limitFor(limits, cat);
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
      {overShared.map((g) => (
        <p key={g.categories.join("+")} className="text-xs text-destructive">
          {g.categories.join(" + ")} share a RM {g.limit.toLocaleString()} limit. You've claimed RM{" "}
          {g.claimed.toLocaleString("en-MY", { minimumFractionDigits: 2 })}, so only RM {g.limit.toLocaleString()} counts.
        </p>
      ))}
    </div>
  );
}
