import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type StepStatus = "pending" | "active" | "done";

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: "Pending",
  active: "Active",
  done: "Done",
};

const STATUS_VARIANT: Record<StepStatus, "outline" | "default" | "secondary"> = {
  pending: "outline",
  active: "default",
  done: "secondary",
};

interface StepCardProps {
  step: number;
  title: string;
  status: StepStatus;
  children: React.ReactNode;
}

export function StepCard({ step, title, status, children }: StepCardProps) {
  return (
    <Card className={status === "pending" ? "opacity-60" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">
          {step}. {title}
        </CardTitle>
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}
