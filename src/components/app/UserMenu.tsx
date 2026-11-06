import { useNavigate } from "react-router-dom";
import { UserProfileDropdown } from "@/components/navigation/UserProfileDropdown";
import { useAuth } from "@/hooks/useAuth";

export function UserMenu() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <UserProfileDropdown
      name={user?.name ?? "Guest user"}
      email={user?.email}
      avatarUrl={user?.avatarUrl}
      onProfile={() => navigate("/app/settings")}
      onSettings={() => navigate("/app/settings")}
      onSignOut={() => {
        void signOut().catch((error: unknown) => {
          console.error("Could not revoke the signed-out session.", error);
        });
        navigate("/login", { replace: true });
      }}
    />
  );
}
