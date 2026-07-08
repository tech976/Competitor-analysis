import { Construction } from "lucide-react";
import { FadeIn } from "@/components/ui/motion";
import { GradientText } from "@/components/ui/GradientText";

/** Honest placeholder for nav sections that aren't built yet. */
export default function ComingSoon({
  title,
  blurb,
}: {
  title: string;
  blurb: string;
}) {
  return (
    <div className="mx-auto max-w-5xl">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">
          <GradientText>{title}</GradientText>
        </h1>
      </FadeIn>
      <FadeIn delay={0.05} className="glass mt-8 grid place-items-center px-6 py-24 text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent-soft">
          <Construction className="h-7 w-7" />
        </span>
        <p className="text-lg font-medium">Coming soon</p>
        <p className="mt-1 max-w-md text-sm text-muted">{blurb}</p>
      </FadeIn>
    </div>
  );
}
