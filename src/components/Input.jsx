import React from "react";

function Input({ type, placeholder, value, onChange, className, name }) {
  return (
    <input
      type={type}
      name={name}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`border px-2 py-1 rounded ${className}`}
    />
  );
}

export default Input;
