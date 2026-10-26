import { Dumbbell, Luggage, Sprout, Users, type LucideIcon } from "lucide-react";
import type { ActivityId } from "../api/types";

export interface ActivityMeta {
  id: ActivityId;
  name: string;
  icon: LucideIcon;
  /** Tailwind classes for the tinted card, icon chip and progress bar. */
  card: string;
  chip: string;
  bar: string;
  ink: string;
}

export const ACTIVITIES: Record<ActivityId, ActivityMeta> = {
  fitness: {
    id: "fitness", name: "Fitness", icon: Dumbbell,
    card: "bg-[#ecf8f0] border-[#d3eedc]", chip: "bg-[#3aa55f] text-white", bar: "bg-[#3aa55f]", ink: "text-[#23864a]",
  },
  travel: {
    id: "travel", name: "Travel", icon: Luggage,
    card: "bg-[#eaf2fe] border-[#d6e5fb]", chip: "bg-[#2f74e0] text-white", bar: "bg-[#2f74e0]", ink: "text-[#1f5fc4]",
  },
  gardening: {
    id: "gardening", name: "Gardening", icon: Sprout,
    card: "bg-[#fff3e6] border-[#fbe2c6]", chip: "bg-[#ef8a2b] text-white", bar: "bg-[#ef8a2b]", ink: "text-[#c96a12]",
  },
  family: {
    id: "family", name: "Family", icon: Users,
    card: "bg-[#f2edfc] border-[#e3d9f8]", chip: "bg-[#7b5bd6] text-white", bar: "bg-[#7b5bd6]", ink: "text-[#6544c4]",
  },
};

export const ACTIVITY_ORDER: ActivityId[] = ["fitness", "travel", "gardening", "family"];
