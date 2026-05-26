import PageHeader from "./PageHeader";
import { FeatureCoach, FeatureCoachTrigger, useFeatureCoach } from "../features/featureCoach";

export default function PageLayout({
  title,
  eyebrow,
  description,
  actions,
  children,
  className = "",
  size = "xl",
  coachFeatureId,
}) {
  const sizes = {
    lg: "max-w-5xl",
    xl: "max-w-7xl",
    full: "max-w-none",
  };

  const coach = useFeatureCoach(coachFeatureId);

  const headerActions = coach.enabled ? (
    <>
      <FeatureCoachTrigger featureId={coachFeatureId} controller={coach} />
      {actions}
    </>
  ) : actions;

  return (
    <div className={`mx-auto min-w-0 w-full max-w-full overflow-x-hidden ${sizes[size] ?? sizes.xl} px-4 py-4 sm:py-5 sm:px-6 lg:px-8 lg:py-8 ${className}`}>
      {(title || description || headerActions) && (
        <PageHeader
          title={title}
          eyebrow={eyebrow}
          description={description}
          actions={headerActions}
        />
      )}
      {coach.enabled && (
        <FeatureCoach featureId={coachFeatureId} controller={coach} />
      )}
      {children}
    </div>
  );
}
