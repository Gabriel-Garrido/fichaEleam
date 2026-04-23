import React from "react";

function Button({ children, onClick, className, type = "button", disabled = false, ...rest }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
