import PageHeader from "./PageHeader";

export default function PageLayout({
  title,
  eyebrow,
  description,
  actions,
  children,
  className = "",
  size = "xl",
}) {
  const sizes = {
    lg: "max-w-5xl",
    xl: "max-w-7xl",
    full: "max-w-none",
  };

  return (
    <div className={`mx-auto w-full ${sizes[size] ?? sizes.xl} px-4 py-5 sm:px-6 lg:px-8 lg:py-8 ${className}`}>
      {(title || description || actions) && (
        <PageHeader
          title={title}
          eyebrow={eyebrow}
          description={description}
          actions={actions}
        />
      )}
      {children}
    </div>
  );
}

