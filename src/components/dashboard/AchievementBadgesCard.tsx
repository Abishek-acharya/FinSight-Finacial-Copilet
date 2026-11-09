import { ArrowTrendingDownIcon, ShieldCheckIcon, TrophyIcon } from "@heroicons/react/24/outline";
import type { Achievement } from "@/services/financialEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const icons = {
  "super-saver": TrophyIcon,
  "budget-master": ShieldCheckIcon,
  "debt-slayer": ArrowTrendingDownIcon,
};

export function AchievementBadgesCard({ achievements }: { achievements: Achievement[] }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-secondary">Milestones</p>
        <CardTitle className="mt-1">Financial achievements</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {achievements.map((achievement) => {
          const Icon = icons[achievement.id];
          return (
            <div
              key={achievement.id}
              className={`rounded-xl border p-4 ${achievement.earned ? "border-accent-primary/35 bg-accent-primary/5" : "border-border bg-surface-secondary/60 opacity-75"}`}
            >
              <div className={`grid size-10 place-items-center rounded-xl ${achievement.earned ? "bg-accent-primary/15 text-accent-secondary" : "bg-surface text-ink-muted"}`}>
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink">
                {achievement.title}
                <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{achievement.earned ? "Earned" : "In progress"}</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted">{achievement.description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
