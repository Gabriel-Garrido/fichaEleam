import { useState } from "react";
import ProspectListsPanel from "./ProspectListsPanel";
import ProspectsPanel from "./ProspectsPanel";
import CampaignsPanel from "./CampaignsPanel";
import SalesFunnelPanel from "./SalesFunnelPanel";
import TabBar from "../../../components/TabBar";

const SUB_TABS = [
  { id: "funnel", label: "Funnel" },
  { id: "prospects", label: "Prospectos" },
  { id: "lists", label: "Listas" },
  { id: "campaigns", label: "Campañas" },
];

export default function ProspectingTab() {
  const [tab, setTab] = useState("funnel");
  const [activeListId, setActiveListId] = useState(null);
  const [pendingCampaignProspectIds, setPendingCampaignProspectIds] = useState([]);

  const handlePickList = (list) => {
    setActiveListId(list.id);
    setTab("prospects");
  };

  const handleStartCampaign = (prospectIds) => {
    setPendingCampaignProspectIds(prospectIds);
    setTab("campaigns");
  };

  const handleConsumeInitialSelection = () => {
    setPendingCampaignProspectIds([]);
  };

  return (
    <div className="space-y-4">
      <div>
        <TabBar tabs={SUB_TABS} active={tab} onChange={setTab} label="Herramientas comerciales" tone="slate" compact className="mb-2" />
        <p className="hidden text-right text-[11px] text-slate-400 sm:block">Funnel unificado: landing, WhatsApp, importados y outbound viven en una sola cartera.</p>
      </div>

      {tab === "funnel" && (
        <SalesFunnelPanel onStartCampaign={handleStartCampaign} />
      )}
      {tab === "prospects" && (
        <ProspectsPanel
          initialListId={activeListId}
          onStartCampaign={handleStartCampaign}
        />
      )}
      {tab === "lists" && (
        <ProspectListsPanel onPickList={handlePickList} />
      )}
      {tab === "campaigns" && (
        <CampaignsPanel
          initialSelectedProspectIds={pendingCampaignProspectIds}
          onConsumeInitialSelection={handleConsumeInitialSelection}
        />
      )}
    </div>
  );
}
