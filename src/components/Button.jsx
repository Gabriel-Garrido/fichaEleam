function Button({ children, onClick, className, type = "button", disabled = false, ...rest }) {
  const baseClasses = [
    "inline-flex items-center justify-center gap-2",
    "min-h-10 rounded-xl px-4 py-2 text-center text-sm font-semibold whitespace-normal",
    "transition-all duration-150 ease-out",
    "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ].join(" ");

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${className || ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
