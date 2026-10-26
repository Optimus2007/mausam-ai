import type { ActivityId, Preferences, TimeOfDay } from "../../api/types";
import { ACTIVITIES, ACTIVITY_ORDER } from "../../lib/activities";
import { cx } from "../../lib/format";
import { DEFAULT_PREFERENCES, useApp } from "../../state/AppState";
import { Sheet } from "../common/ui";

const TIMES: { id: TimeOfDay; label: string; hint: string }[] = [
  { id: "morning", label: "Morning", hint: "5–11 AM" },
  { id: "midday", label: "Midday", hint: "11 AM–4 PM" },
  { id: "evening", label: "Evening", hint: "4–9 PM" },
  { id: "night", label: "Night", hint: "9 PM–12 AM" },
];

const HEAT: { id: Preferences["heat_sensitivity"]; label: string }[] = [
  { id: "low", label: "I handle heat well" },
  { id: "normal", label: "Normal" },
  { id: "high", label: "Heat sensitive" },
];

export function PreferencesSheet() {
  const { sheet, openSheet, prefs, setPrefs } = useApp();
  const open = sheet?.kind === "prefs";

  const toggleActivity = (id: ActivityId) => {
    const has = prefs.activities.includes(id);
    if (has && prefs.activities.length === 1) return; // keep at least one
    const activities = has ? prefs.activities.filter((a) => a !== id) : ACTIVITY_ORDER.filter((a) => a === id || prefs.activities.includes(a));
    const focus = activities.includes(prefs.focus_activity) ? prefs.focus_activity : activities[0];
    setPrefs({ ...prefs, activities, focus_activity: focus });
  };
  const toggleTime = (id: TimeOfDay) => {
    const has = prefs.preferred_times.includes(id);
    setPrefs({ ...prefs, preferred_times: has ? prefs.preferred_times.filter((t) => t !== id) : [...prefs.preferred_times, id] });
  };

  return (
    <Sheet open={open} onClose={() => openSheet(null)} title="Activity preferences"
      subtitle="Saved on this device. Recommendations update automatically.">
      <section>
        <h3 className="text-[13px] font-bold">Activities you care about</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {ACTIVITY_ORDER.map((id) => {
            const a = ACTIVITIES[id];
            const on = prefs.activities.includes(id);
            return (
              <button key={id} onClick={() => toggleActivity(id)} aria-pressed={on}
                className={cx("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[14px] font-semibold transition",
                  on ? a.card + " text-navy" : "border-line bg-white text-ink-3")}>
                <span className={cx("flex h-7 w-7 items-center justify-center rounded-full", on ? a.chip : "bg-slate-100")}>
                  <a.icon size={15} />
                </span>
                {a.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-[13px] font-bold">Focus activity for the AI recommendation</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {prefs.activities.map((id) => (
            <button key={id} onClick={() => setPrefs({ ...prefs, focus_activity: id })} aria-pressed={prefs.focus_activity === id}
              className={cx("rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                prefs.focus_activity === id ? "bg-navy-2 text-white" : "bg-sky-soft text-navy-2")}>
              {ACTIVITIES[id].name}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-[13px] font-bold">Preferred times</h3>
        <p className="text-[12px] text-ink-3">Windows are searched here first. Leave all off to consider any waking hour.</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {TIMES.map((t) => {
            const on = prefs.preferred_times.includes(t.id);
            return (
              <button key={t.id} onClick={() => toggleTime(t.id)} aria-pressed={on}
                className={cx("rounded-xl border px-3 py-2 text-left", on ? "border-brand bg-sky-soft" : "border-line")}>
                <span className="block text-[14px] font-semibold">{t.label}</span>
                <span className="block text-[12px] text-ink-3">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-5">
        <h3 className="text-[13px] font-bold">Heat tolerance</h3>
        <div className="mt-2 flex rounded-xl bg-sky-soft p-1">
          {HEAT.map((h) => (
            <button key={h.id} onClick={() => setPrefs({ ...prefs, heat_sensitivity: h.id })} aria-pressed={prefs.heat_sensitivity === h.id}
              className={cx("flex-1 rounded-lg px-2 py-2 text-[12px] font-semibold",
                prefs.heat_sensitivity === h.id ? "bg-white text-navy shadow-sm" : "text-ink-2")}>
              {h.label}
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6 flex gap-2 pb-2">
        <button className="btn-soft" onClick={() => setPrefs(DEFAULT_PREFERENCES)}>Reset</button>
        <button className="btn-primary" onClick={() => openSheet(null)}>Done</button>
      </div>
    </Sheet>
  );
}
