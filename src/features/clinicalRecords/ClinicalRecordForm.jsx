import React from "react";
import { Navigate } from "react-router-dom";

function ClinicalRecordForm() {
  return <Navigate to="/observations/new" replace />;
}

export default ClinicalRecordForm;
