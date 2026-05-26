import { useState } from "react";
import ProspectListsPanel from "./ProspectListsPanel";
import ProspectsPanel from "./ProspectsPanel";
import CampaignsPanel from "./CampaignsPanel";
import SalesFunnelPanel from "./SalesFunnelPanel";

const SUB_TABS = [
  { key: "funnel", label: "Funnel" },
  { key: "prospects", label: "Prospectos" },
  { key: "lists", label: "Listas" },
  { key: "campaigns", label: "Campañas" },
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
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        {SUB_TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`tap-highlight-none relative inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === key
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto hidden text-[11px] text-slate-400 sm:block">
          Funnel unificado: landing, WhatsApp, importados y outbound viven en una sola cartera.
        </div>
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
