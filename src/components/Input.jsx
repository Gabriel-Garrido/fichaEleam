import React from "react";

function Input({ className = "", ...props }) {
  const baseClasses = [
    "w-full min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900",
    "shadow-sm transition-colors",
    "placeholder:text-slate-400",
    "focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20",
    "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
  ].join(" ");

  return (
    <input
      className={`${baseClasses} ${className}`}
      {...props}
    />
  );
}

export default Input;
