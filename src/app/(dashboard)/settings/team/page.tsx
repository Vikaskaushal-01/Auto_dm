import { getCurrentWorkspaceContext } from "@/lib/current-workspace";
import { db } from "@/lib/db";
import { InviteMemberForm } from "@/components/settings/invite-member-form";
import { RemoveMemberButton } from "@/components/settings/remove-member-button";

const ROLE_STYLES: Record<string, string> = {
  OWNER: "bg-violet-600/15 text-violet-300",
  ADMIN: "bg-sky-500/15 text-sky-400",
  MEMBER: "bg-neutral-700 text-neutral-300",
};

export default async function TeamSettingsPage() {
  const { workspaceId } = await getCurrentWorkspaceContext();
  const members = await db.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Team</h1>
        <p className="mt-1 text-sm text-neutral-400">Invite teammates to this workspace.</p>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
        <InviteMemberForm />
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-3 py-3 font-medium">Role</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-neutral-800/60">
                <td className="px-4 py-3">
                  <p className="text-neutral-200">{m.user?.name ?? m.invitedEmail ?? "Unknown"}</p>
                  <p className="text-xs text-neutral-500">{m.user?.email ?? m.invitedEmail}</p>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[m.role]}`}
                  >
                    {m.role}
                  </span>
                </td>
                <td className="px-3 py-3 text-neutral-400">{m.status}</td>
                <td className="px-3 py-3 text-right">
                  {m.role !== "OWNER" && <RemoveMemberButton memberId={m.id} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
