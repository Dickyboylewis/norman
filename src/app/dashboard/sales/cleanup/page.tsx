"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface AnalyzeResponse {
  summary: {
    totalAccounts: number;
    wordSplits: number;
    commaStrips: number;
    duplicateClusters: number;
    totalDuplicatesToMerge: number;
  };
  wordSplits: Array<{ id: string; current: string; suggested: string }>;
  commaStrips: Array<{ id: string; current: string; suggested: string }>;
  duplicateClusters: Array<{
    canonical: { id: string; name: string; contactCount: number };
    duplicates: Array<{ id: string; name: string; contactCount: number }>;
    reason: string;
    totalContactsToMove: number;
  }>;
}

export default function CleanupPage() {
  const { data, isLoading, error } = useQuery<AnalyzeResponse>({
    queryKey: ["cleanup-analyze"],
    queryFn: async () => {
      const res = await fetch("/api/crm/cleanup/analyze");
      if (!res.ok) throw new Error("Failed to analyze");
      return res.json();
    },
    staleTime: Infinity,
  });

  const [renameSelections, setRenameSelections] = useState<
    Record<string, { selected: boolean; newName: string }>
  >({});
  const [mergeSelections, setMergeSelections] = useState<
    Record<string, { selected: boolean; canonicalId: string; duplicateIds: string[] }>
  >({});
  const [openSection, setOpenSection] = useState<"splits" | "commas" | "merges" | null>("splits");
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    summary: Record<string, number>;
    log: string[];
  } | null>(null);

  useEffect(() => {
    if (!data) return;
    const renames: Record<string, { selected: boolean; newName: string }> = {};
    for (const item of [...data.wordSplits, ...data.commaStrips]) {
      renames[item.id] = { selected: true, newName: item.suggested };
    }
    setRenameSelections(renames);

    const merges: Record<string, { selected: boolean; canonicalId: string; duplicateIds: string[] }> = {};
    for (const cluster of data.duplicateClusters) {
      merges[cluster.canonical.id] = {
        selected: true,
        canonicalId: cluster.canonical.id,
        duplicateIds: cluster.duplicates.map(d => d.id),
      };
    }
    setMergeSelections(merges);
  }, [data]);

  const handleApply = async () => {
    setIsApplying(true);
    setApplyResult(null);
    const renames = Object.entries(renameSelections)
      .filter(([, v]) => v.selected)
      .map(([id, v]) => ({ id, newName: v.newName }));
    const merges = Object.values(mergeSelections).filter(v => v.selected);
    try {
      const res = await fetch("/api/crm/cleanup/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renames, merges }),
      });
      const result = await res.json();
      setApplyResult(result);
    } catch (e) {
      setApplyResult({ summary: { error: 1 }, log: [String(e)] });
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-3 text-gray-500">
        <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        Analysing accounts… this can take 30–60 seconds for large boards.
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-8 text-red-500">Failed to load analysis. Check server logs.</div>;
  }

  const totalRenameSelected = Object.values(renameSelections).filter(v => v.selected).length;
  const totalMergeSelected = Object.values(mergeSelections).filter(v => v.selected).length;
  const totalSelected = totalRenameSelected + totalMergeSelected;

  return (
    <div className="p-6 max-w-5xl mx-auto pb-32">
      <h1 className="text-2xl font-bold mb-1">Accounts Cleanup</h1>
      <p className="text-gray-500 text-sm mb-6">
        Review the proposed changes. Untick anything wrong, edit names if needed, then click Apply.
      </p>

      {/* Summary banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm">
        <div className="font-semibold text-amber-900 mb-1">
          Analysis complete — {data.summary.totalAccounts} accounts scanned
        </div>
        <div className="text-amber-800 flex flex-wrap gap-4">
          <span>
            <strong>{data.summary.wordSplits}</strong> word-split fixes
          </span>
          <span>
            <strong>{data.summary.commaStrips}</strong> comma-strip fixes
          </span>
          <span>
            <strong>{data.summary.duplicateClusters}</strong> duplicate clusters (
            <strong>{data.summary.totalDuplicatesToMerge}</strong> to merge)
          </span>
        </div>
      </div>

      {/* Word Splits */}
      <Section
        title={`Word splits (${data.wordSplits.length})`}
        isOpen={openSection === "splits"}
        onToggle={() => setOpenSection(openSection === "splits" ? null : "splits")}
        badge={data.wordSplits.length}
        badgeColor="blue"
      >
        {data.wordSplits.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No word-split issues found.</p>
        ) : (
          data.wordSplits.map(item => (
            <RenameRow
              key={item.id}
              item={item}
              selection={renameSelections[item.id]}
              onChange={s => setRenameSelections(prev => ({ ...prev, [item.id]: s }))}
            />
          ))
        )}
      </Section>

      {/* Comma Strips */}
      <Section
        title={`Comma strips (${data.commaStrips.length})`}
        isOpen={openSection === "commas"}
        onToggle={() => setOpenSection(openSection === "commas" ? null : "commas")}
        badge={data.commaStrips.length}
        badgeColor="purple"
      >
        {data.commaStrips.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No comma-strip issues found.</p>
        ) : (
          data.commaStrips.map(item => (
            <RenameRow
              key={item.id}
              item={item}
              selection={renameSelections[item.id]}
              onChange={s => setRenameSelections(prev => ({ ...prev, [item.id]: s }))}
            />
          ))
        )}
      </Section>

      {/* Duplicate Merges */}
      <Section
        title={`Duplicate merges (${data.duplicateClusters.length} clusters)`}
        isOpen={openSection === "merges"}
        onToggle={() => setOpenSection(openSection === "merges" ? null : "merges")}
        badge={data.duplicateClusters.length}
        badgeColor="red"
      >
        {data.duplicateClusters.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No duplicate accounts found.</p>
        ) : (
          data.duplicateClusters.map(cluster => (
            <ClusterRow
              key={cluster.canonical.id}
              cluster={cluster}
              selection={mergeSelections[cluster.canonical.id]}
              onChange={s => setMergeSelections(prev => ({ ...prev, [cluster.canonical.id]: s }))}
            />
          ))
        )}
      </Section>

      {/* Apply Results */}
      {applyResult && (
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="font-semibold mb-3 flex items-center gap-2">
            {(applyResult.summary.errors ?? 0) > 0 ? (
              <span className="text-amber-600">⚠ Apply complete with {applyResult.summary.errors} errors</span>
            ) : (
              <span className="text-green-700">✓ Apply complete</span>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm mb-3">
            {Object.entries(applyResult.summary).map(([k, v]) => (
              <span key={k} className="bg-white border border-gray-200 rounded px-2 py-1">
                <strong>{v}</strong> {k}
              </span>
            ))}
          </div>
          <pre className="text-xs bg-white p-3 rounded border border-gray-200 max-h-96 overflow-auto whitespace-pre-wrap">
            {applyResult.log.join("\n")}
          </pre>
        </div>
      )}

      {/* Sticky Apply Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between z-20 shadow-lg">
        <div className="text-sm text-gray-600">
          <strong>{totalRenameSelected}</strong> renames + <strong>{totalMergeSelected}</strong> merges selected
        </div>
        <button
          onClick={handleApply}
          disabled={isApplying || totalSelected === 0}
          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          {isApplying
            ? "Applying… (may take several minutes)"
            : totalSelected === 0
            ? "No changes selected"
            : `Apply ${totalSelected} Changes`}
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  isOpen,
  onToggle,
  badge,
  badgeColor,
  children,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  badge: number;
  badgeColor: "blue" | "purple" | "red";
  children: React.ReactNode;
}) {
  const badgeClasses = {
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    red: "bg-red-100 text-red-700",
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full bg-gray-50 hover:bg-gray-100 px-4 py-3 text-left font-semibold flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {badge > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClasses[badgeColor]}`}>
              {badge}
            </span>
          )}
        </div>
        <span className="text-gray-400 text-sm">{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && (
        <div className="p-4 space-y-1.5 max-h-[600px] overflow-auto">{children}</div>
      )}
    </div>
  );
}

function RenameRow({
  item,
  selection,
  onChange,
}: {
  item: { id: string; current: string; suggested: string };
  selection: { selected: boolean; newName: string } | undefined;
  onChange: (s: { selected: boolean; newName: string }) => void;
}) {
  if (!selection) return null;
  return (
    <div className={`flex items-center gap-3 py-1.5 px-2 rounded border ${selection.selected ? "border-gray-200 bg-white" : "border-transparent bg-gray-50 opacity-50"}`}>
      <input
        type="checkbox"
        checked={selection.selected}
        onChange={e => onChange({ ...selection, selected: e.target.checked })}
        className="h-4 w-4 flex-shrink-0"
      />
      <span className="text-gray-400 text-sm line-through truncate flex-1 min-w-0">
        {item.current}
      </span>
      <span className="text-gray-400 text-xs flex-shrink-0">→</span>
      <input
        type="text"
        value={selection.newName}
        onChange={e => onChange({ ...selection, newName: e.target.value })}
        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 min-w-0 focus:outline-none focus:border-blue-400"
      />
    </div>
  );
}

function ClusterRow({
  cluster,
  selection,
  onChange,
}: {
  cluster: {
    canonical: { id: string; name: string; contactCount: number };
    duplicates: Array<{ id: string; name: string; contactCount: number }>;
    reason: string;
    totalContactsToMove: number;
  };
  selection: { selected: boolean; canonicalId: string; duplicateIds: string[] } | undefined;
  onChange: (s: { selected: boolean; canonicalId: string; duplicateIds: string[] }) => void;
}) {
  if (!selection) return null;

  const allItems = [cluster.canonical, ...cluster.duplicates];

  return (
    <div className={`border rounded-lg p-3 ${selection.selected ? "border-gray-200 bg-white" : "border-transparent bg-gray-50 opacity-50"}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selection.selected}
          onChange={e => onChange({ ...selection, selected: e.target.checked })}
          className="h-4 w-4 mt-1 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-400 mb-2">
            {cluster.reason}
            {cluster.totalContactsToMove > 0 && (
              <> · <strong className="text-amber-600">{cluster.totalContactsToMove} contacts will be moved</strong></>
            )}
          </div>
          <div className="space-y-1">
            {allItems.map(item => {
              const isCanonical = item.id === selection.canonicalId;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between py-1.5 px-3 rounded text-sm ${
                    isCanonical
                      ? "bg-green-50 border border-green-200"
                      : "bg-gray-50 border border-transparent"
                  }`}
                >
                  <span className={isCanonical ? "font-semibold text-green-900" : "text-gray-600"}>
                    {isCanonical && <span className="text-green-600 mr-1">✓ KEEP</span>}
                    {item.name}
                    <span className="text-xs text-gray-400 ml-2">({item.contactCount} contacts)</span>
                  </span>
                  {!isCanonical && (
                    <button
                      onClick={() => {
                        const newDups = allItems.filter(i => i.id !== item.id).map(i => i.id);
                        onChange({ ...selection, canonicalId: item.id, duplicateIds: newDups });
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-2 flex-shrink-0"
                    >
                      Make canonical
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
