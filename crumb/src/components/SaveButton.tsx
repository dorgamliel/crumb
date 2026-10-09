import { Bookmark } from "lucide-react";
import { getTopic } from "../lib/content";
import { store, useStore } from "../lib/storage";
import { useToast } from "./Toast";

export function SaveButton({ id, variant = "icon" }: { id: string; variant?: "icon" | "pill" }) {
  const { saved } = useStore();
  const toast = useToast();
  const isSaved = saved.includes(id);
  const name = getTopic(id)?.name ?? "";

  const toggle = () => {
    const index = store.get().saved.indexOf(id);
    const nowSaved = store.toggleSaved(id);
    if (nowSaved) toast("נשמר לקריאה בהמשך");
    else toast("הוסר מהשמורים", { label: "ביטול", run: () => store.restoreSaved(id, index) });
  };

  return (
    <button
      type="button"
      className={`save save--${variant}`}
      aria-pressed={isSaved}
      aria-label={variant === "icon" ? (isSaved ? `הסרה מהשמורים: ${name}` : `שמירה: ${name}`) : undefined}
      onClick={(e) => {
        e.stopPropagation();
        toggle();
      }}
    >
      <Bookmark aria-hidden="true" size={18} strokeWidth={1.8} fill={isSaved ? "currentColor" : "none"} />
      {variant === "pill" && <span>{isSaved ? "שמור" : "שמירה"}</span>}
    </button>
  );
}
