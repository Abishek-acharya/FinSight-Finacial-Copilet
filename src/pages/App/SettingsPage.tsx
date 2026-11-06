import { PlaceholderModulePage } from "@/pages/App/PlaceholderModulePage";

export default function SettingsPage() {
  return (
    <PlaceholderModulePage
      eyebrow="Settings"
      title="Account controls"
      summary="Manage your profile, security preferences, and notification choices in a single place. This panel is designed to keep everyday controls close at hand."
      highlights={[
        "Profile and account preferences",
        "Security and session controls",
        "Notification and privacy settings",
      ]}
    />
  );
}
