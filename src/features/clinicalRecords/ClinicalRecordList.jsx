import React from "react";
import { Navigate } from "react-router-dom";

function ClinicalRecordList() {
  return <Navigate to="/observations" replace />;
}

export default ClinicalRecordList;
