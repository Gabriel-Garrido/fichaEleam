import React from "react";
import { Navigate } from "react-router-dom";

function ClinicalRecordDetails() {
  return <Navigate to="/observations" replace />;
}

export default ClinicalRecordDetails;
