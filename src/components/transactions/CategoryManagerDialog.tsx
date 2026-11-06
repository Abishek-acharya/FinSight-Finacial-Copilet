import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { UserCategory } from "@/store/financeStore";

export function CategoryManagerDialog({
  open,
  onClose,
  categories,
  onAdd,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  categories: UserCategory[];
  onAdd: (category: Omit<UserCategory, "id" | "isSystem">) => void;
  onUpdate: (id: string, patch: Partial<Pick<UserCategory, "name" | "type" | "color" | "active">>) => void;
  onDelete: (category: UserCategory) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState("#D97745");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!name.trim()) throw new Error("Enter a category name.");
      onAdd({ name: name.trim(), type, color, active: true });
      setName("");
      setError("");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not add category.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" description="Custom categories are stored with your finance data in this browser." size="lg">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <form className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_auto_auto_auto]" onSubmit={submit}>
          <Input label="New category name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Pet care" />
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Type
            <select className="min-h-11 rounded-lg border border-border bg-surface px-2 text-sm text-ink" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Color
            <input aria-label="New category color" className="h-11 w-16 rounded-lg border border-border bg-surface p-1" type="color" value={color} onChange={(event) => setColor(event.target.value)} />
          </label>
          <Button type="submit" className="self-end">Add</Button>
          {error && <p className="text-xs text-error sm:col-span-full" role="alert">{error}</p>}
        </form>

        <ul className="space-y-2">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onUpdate={(patch) => onUpdate(category.id, patch)}
              onDelete={() => onDelete(category)}
            />
          ))}
        </ul>
        <div className="flex justify-end border-t border-border pt-3">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

function CategoryRow({
  category,
  onUpdate,
  onDelete,
}: {
  category: UserCategory;
  onUpdate: (patch: Partial<Pick<UserCategory, "name" | "type" | "color" | "active">>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [error, setError] = useState("");
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
      <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              onUpdate({ name: name.trim() });
              setEditing(false);
              setError("");
            } catch (saveError) {
              setError(saveError instanceof Error ? saveError.message : "Could not rename category.");
            }
          }}
        >
          <Input aria-label={`Rename ${category.name}`} value={name} onChange={(event) => setName(event.target.value)} />
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setName(category.name); }}>Cancel</Button>
        </form>
      ) : (
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
      )}
      <span className="text-[11px] capitalize text-ink-muted">{category.type}{category.isSystem ? " · built-in" : " · custom"}</span>
      <label className="flex items-center gap-1.5 text-xs text-ink-muted">
        <input
          type="checkbox"
          checked={category.active}
          disabled={category.isSystem}
          onChange={(event) => onUpdate({ active: event.target.checked })}
        />
        Active
      </label>
      {!category.isSystem && !editing && (
        <>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Rename</Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>Delete</Button>
        </>
      )}
      {error && <p className="basis-full text-xs text-error" role="alert">{error}</p>}
    </li>
  );
}
