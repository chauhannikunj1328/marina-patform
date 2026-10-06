// First tab: Today for staff, Overview for managers and admins.
import Overview from "@/screens/overview";
import Today from "@/screens/today";
import { useStore } from "@/store";

export default function Home() {
  const { isManager } = useStore();
  return isManager ? <Overview /> : <Today />;
}
