import { memo } from "react";
import WelcomeHeader from "@/components/dashboard/my-tasks/WelcomeHeader";

interface WelcomePanelProps {
  name: string;
  nameAr?: string;
  hue: number;
  sat?: number;
}

// Fully static — doesn't depend on any prop, so it's hoisted out of the
// component instead of being recreated as a new object every render.
const PANEL_STYLE: React.CSSProperties = {
  background: "linear-gradient(135deg, rgba(69,132,130,0.14), rgba(255,255,255,0.025))",
  border: "1px solid var(--card-border)",
};

function WelcomePanel({
  name,
  nameAr,
  hue,
  sat,
}: WelcomePanelProps) {
  return (
    <div
      className="min-h-[210px] rounded-2xl px-6 sm:px-8 py-7 flex items-center"
      style={PANEL_STYLE}
    >
      <WelcomeHeader
        name={name}
        nameAr={nameAr}
        hue={hue}
        sat={sat}
      />
    </div>
  );
}

export default memo(WelcomePanel);