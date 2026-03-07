import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LIMITS, DeductionCategory, Deduction, MONTHS } from "@/lib/deduction-data";

const COLORS = [
  "hsl(265, 85%, 65%)",
  "hsl(38, 92%, 55%)",
  "hsl(152, 55%, 42%)",
  "hsl(280, 70%, 55%)",
  "hsl(0, 72%, 55%)",
  "hsl(200, 70%, 50%)",
  "hsl(330, 70%, 55%)",
  "hsl(60, 70%, 45%)",
];

interface Props {
  totalByCategory: Record<string, number>;
  deductions: Deduction[];
}

export function DashboardCharts({ totalByCategory, deductions }: Props) {
  const pieData = Object.entries(totalByCategory).map(([name, value]) => ({
    name,
    value,
  }));

  const monthlyData = MONTHS.map((month) => {
    const monthDeductions = deductions.filter((d) => {
      if (d.frequency === "monthly") return d.month === month;
      return false;
    });
    const yearlyPerMonth = deductions
      .filter((d) => d.frequency === "yearly")
      .reduce((sum, d) => sum + d.amount / 12, 0);
    const monthlyTotal = monthDeductions.reduce((sum, d) => sum + d.amount, 0);
    return {
      month: month.slice(0, 3),
      amount: Math.round((monthlyTotal + yearlyPerMonth) * 100) / 100,
    };
  });

  if (pieData.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Charts</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="category">
          <TabsList className="w-full">
            <TabsTrigger value="category" className="flex-1">By Category</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1">Monthly Trend</TabsTrigger>
          </TabsList>
          <TabsContent value="category" className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name.length > 12 ? name.slice(0, 12) + "…" : name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: "hsl(270, 35%, 9%)", border: "1px solid hsl(270, 20%, 18%)", borderRadius: "0.5rem", color: "hsl(270, 20%, 91%)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="monthly" className="pt-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="month" fontSize={12} stroke="hsl(270, 15%, 55%)" />
                <YAxis fontSize={12} stroke="hsl(270, 15%, 55%)" />
                <Tooltip
                  formatter={(value: number) => `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2 })}`}
                  contentStyle={{ backgroundColor: "hsl(270, 35%, 9%)", border: "1px solid hsl(270, 20%, 18%)", borderRadius: "0.5rem", color: "hsl(270, 20%, 91%)" }}
                />
                <Bar dataKey="amount" fill="hsl(265, 85%, 65%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
