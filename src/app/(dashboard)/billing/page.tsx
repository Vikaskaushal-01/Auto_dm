import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { db } from "@/lib/db";
import { PLAN_DEFS, PLAN_RANK, type PurchasablePlan } from "@/lib/plans";
import { PlanCard } from "@/components/billing/plan-card";

export default async function BillingPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const subscription = await db.subscription.findUnique({ where: { workspaceId } });

  const currentPlan: PurchasablePlan | null = workspace.plan in PLAN_RANK ? (workspace.plan as PurchasablePlan) : null;
  const currentRank = currentPlan ? PLAN_RANK[currentPlan] : -1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {currentPlan
            ? `You're on the ${currentPlan} plan${subscription?.currentPeriodEnd ? ` — renews ${subscription.currentPeriodEnd.toLocaleDateString()}` : ""}.`
            : "You're in demo mode. Pick a plan below."}
        </p>
        <p className="mt-1 text-xs text-neutral-600">
          No real payment provider is connected yet — switching plans here updates your workspace instantly with no charge.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLAN_DEFS.map((planDef) => (
          <PlanCard
            key={planDef.plan}
            planDef={planDef}
            isCurrent={currentPlan === planDef.plan}
            isDowngrade={currentRank > PLAN_RANK[planDef.plan]}
          />
        ))}
      </div>
    </div>
  );
}
