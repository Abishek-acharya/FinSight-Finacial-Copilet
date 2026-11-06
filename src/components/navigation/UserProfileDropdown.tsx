import { ChevronDownIcon } from "@heroicons/react/20/solid";
import { ArrowRightOnRectangleIcon, Cog6ToothIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, type DropdownItem } from "./Dropdown";

export interface UserProfileDropdownProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  onProfile?: () => void;
  onSettings?: () => void;
  onSignOut?: () => void;
}

export function UserProfileDropdown({
  name,
  email,
  avatarUrl,
  onProfile,
  onSettings,
  onSignOut,
}: UserProfileDropdownProps) {
  const items: DropdownItem[] = [
    ...(onProfile ? [{ label: "Profile", onSelect: onProfile, icon: <UserCircleIcon className="size-4" /> }] : []),
    ...(onSettings ? [{ label: "Settings", onSelect: onSettings, icon: <Cog6ToothIcon className="size-4" /> }] : []),
    ...(onSignOut ? [{ label: "Sign out", onSelect: onSignOut, icon: <ArrowRightOnRectangleIcon className="size-4" />, destructive: true }] : []),
  ];

  return (
    <Dropdown
      label={
        <>
          <Avatar name={name} src={avatarUrl} size="sm" />
          <span className="hidden text-left sm:block">
            <span className="block max-w-32 truncate text-sm font-semibold text-ink">{name}</span>
            {email && <span className="block max-w-32 truncate text-xs text-ink-muted">{email}</span>}
          </span>
          <ChevronDownIcon className="size-4 text-ink-muted" />
        </>
      }
      items={items}
    />
  );
}