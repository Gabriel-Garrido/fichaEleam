import React, { createContext, useState } from "react";

export const ResidentContext = createContext();

function ResidentProvider({ children }) {
  const [residents, setResidents] = useState([]);

  return (
    <ResidentContext.Provider value={{ residents, setResidents }}>
      {children}
    </ResidentContext.Provider>
  );
}

export default ResidentProvider;
