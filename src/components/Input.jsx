import React from "react";

function Input({ type, placeholder, value, onChange, className }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`border px-2 py-1 rounded ${className}`}
    />
  );
}

export default Input;
