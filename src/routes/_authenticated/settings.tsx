import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel } from "@/components/kit";
import { meta } from "@/lib/meta";
export const Route = createFileRoute("/_authenticated/settings")({ head: meta("Settings", "Workspace settings."), component: P });
function P() {
  const { user, role } = Route.useRouteContext();
  return (<><PageHeader title="Settings" />
    <Panel title="Your account"><p className="text-sm">{user.email}</p><p className="mt-1 font-mono text-xs uppercase text-muted-foreground">Role: {role}</p>
      <p className="mt-3 text-xs text-muted-foreground">The first account is the administrator. New accounts start as viewers; operators can run live sessions and change records.</p></Panel></>);
}
