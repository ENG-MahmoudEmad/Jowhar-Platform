import WelcomeHeader from "@/components/dashboard/my-tasks/WelcomeHeader";

interface WelcomePanelProps {
  name: string;
  nameAr?: string;
  hue: number;
  sat?: number;
}

export default function WelcomePanel({
  name,
  nameAr,
  hue,
  sat,
}: WelcomePanelProps) {
  return (
    <div
      className="min-h-[210px] rounded-2xl px-6 sm:px-8 py-7 flex items-center"
      style={{
        background:
          "linear-gradient(135deg, rgba(69,132,130,0.14), rgba(255,255,255,0.025))",
        border: "1px solid var(--card-border)",
      }}
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
