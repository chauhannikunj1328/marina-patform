// Home tab: staff get Today (their shift and the dock), managers and admins get the Overview.
import { useRole } from "@/lib/role";
import { Overview } from "@/screens/Overview";
import { StaffToday } from "@/screens/StaffToday";

export default function Home() {
  const { office } = useRole();
  return office ? <Overview /> : <StaffToday />;
}
