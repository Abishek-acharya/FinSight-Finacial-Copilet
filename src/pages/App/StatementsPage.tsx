import { PlaceholderModulePage } from "@/pages/App/PlaceholderModulePage";

export default function StatementsPage() {
  return (
    <PlaceholderModulePage
      eyebrow="Statements"
      title="Statement archive"
      summary="Organize and review monthly account statements, connect upcoming bills, and highlight unusual transactions before they become surprises."
      highlights={[
        "Monthly PDF exports and statement rollups",
        "End-of-cycle balance comparisons",
        "Category-level variance alerts",
      ]}
    />
  );
}
