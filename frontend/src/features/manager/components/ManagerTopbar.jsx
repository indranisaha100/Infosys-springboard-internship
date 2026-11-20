
import DashboardHeader from "../../../shared/components/DashboardHeader";

export default function ManagerTopbar({ manager, onLogout }) {
  const name = [
    manager?.firstName,
    manager?.lastName,
  ].filter(Boolean).join(" ") || "Manager";

  const initials = `${manager?.firstName?.[0] || name[0]}${manager?.lastName?.[0] || ""}`.toUpperCase();
  return <DashboardHeader title="Manager Dashboard" name={name} initials={initials} onLogout={onLogout} />;
}
