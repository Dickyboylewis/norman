"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as d3 from "d3";
import type { AccountNode, AccountEdge, ContactNode } from "@/types/crm";

// ── Director configuration ───────────────────────────────────────────────────

const DIRECTOR_COLORS: Record<string, string> = {
  dicky: "#EAB308",
  joe:   "#DC2626",
  jesus: "#2563EB",
};

const DIRECTOR_NODES = [
  { id: "director-dicky", name: "Dicky", director: "dicky" as const, photo: "/dicky.png",  color: "#EAB308" },
  { id: "director-joe",   name: "Joe",   director: "joe"   as const, photo: "/joe.png",    color: "#DC2626" },
  { id: "director-jesus", name: "Jesus", director: "jesus" as const, photo: "/jesus.png",  color: "#2563EB" },
];

// ── Cluster x-positions ──────────────────────────────────────────────────────

const CLUSTER_X: Record<string, number> = {
  directors:   0.05,
  consultants: 0.45,
  clients:     0.82,
  unknown:     0.55,
};

// ── Brand colours ────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  "CBRE": "#006A4D",
  "JLL": "#E30613",
  "Savills": "#003057",
  "Knight Frank": "#97272C",
  "Colliers": "#002554",
  "Colliers International": "#002554",
  "Cushman & Wakefield": "#C8102E",
  "Avison Young": "#E4002B",
  "BNP Paribas": "#009A44",
  "Arup": "#E03C31",
  "WSP": "#DA291C",
  "Aecom": "#00AEEF",
  "Arcadis": "#F7A600",
  "Mott MacDonald": "#004B87",
  "Grosvenor": "#1A1A1A",
  "British Land": "#002D62",
  "Landsec": "#E4002B",
  "Land Securities": "#E4002B",
  "Derwent": "#006747",
  "Derwent London": "#006747",
  "GPE": "#231F20",
  "Great Portland": "#231F20",
  "Helical": "#8B0000",
  "Workspace": "#7B2D8B",
  "WeWork": "#0D0D0D",
  "Nuveen": "#00558C",
  "BEAM": "#FF6B35",
  "Kadans": "#003082",
  "Deloitte": "#86BC25",
  "KPMG": "#00338D",
  "PwC": "#D04A02",
  "EY": "#FFE600",
  "Goldman Sachs": "#6699CC",
  "Blackstone": "#1A1A1A",
  "Brookfield": "#0033A0",
  "Hines": "#8B2500",
  "AXA": "#00008F",
  "Schroders": "#6B0099",
  "Legal & General": "#00A651",
  "Legal and General": "#00A651",
  "Standard Life": "#582C83",
  "Aberdeen": "#8DC63F",
  "M&G": "#009B77",
  "Columbia Threadneedle": "#C8102E",
  "Invesco": "#003087",
  "PGIM": "#003DA5",
  "Allianz": "#003781",
  "DWS": "#003082",
  "Zurich": "#0033A0",
  "Segro": "#E4002B",
  "Hammerson": "#1B3A6B",
  "Turner & Townsend": "#E4002B",
  "Turner Townsend": "#E4002B",
  "Gleeds": "#003082",
  "Gardiner": "#004B87",
  "Currie & Brown": "#E4002B",
  "Faithful": "#1A1A1A",
  "Mace": "#E4002B",
  "Skanska": "#0073CF",
  "Multiplex": "#1A1A1A",
  "Laing O'Rourke": "#E4002B",
  "Balfour Beatty": "#003082",
  "Kier": "#003082",
  "Morgan Sindall": "#003082",
  "Wates": "#E4002B",
  "ISG": "#003082",
  "Lendlease": "#E4002B",
  "BAM": "#E4002B",
  "Galliford Try": "#E4002B",
  "Buro Happold": "#E30613",
  "Ramboll": "#008FBE",
  "Hoare Lea": "#003082",
  "Cundall": "#E4002B",
  "Max Fordham": "#003082",
  "Hilson Moran": "#003082",
  "Hawkins Brown": "#E4002B",
  "Sheppard Robson": "#003082",
  "BDP": "#003082",
  "AHMM": "#1A1A1A",
  "tp bennett": "#E4002B",
  "TP Bennett": "#E4002B",
  "Scott Brownrigg": "#003082",
  "Broadway Malyan": "#E4002B",
  "Grimshaw": "#1A1A1A",
  "Foster": "#1A1A1A",
  "Fosters": "#1A1A1A",
  "SOM": "#003082",
  "Gensler": "#FF6600",
  "HOK": "#003082",
  "Populous": "#003082",
  "Perkins and Will": "#003082",
  "Stanton Williams": "#1A1A1A",
  "Wilkinson Eyre": "#E4002B",
  "Make": "#E4002B",
  "TFT": "#003082",
  "Tuffin Ferraby": "#003082",
  "Buro Four": "#E4002B",
  "BuroFour": "#E4002B",
  "TOG": "#1A1A1A",
  "The Office Group": "#1A1A1A",
  "Fora": "#2D6A4F",
  "IWG": "#003082",
  "Regus": "#003082",
  "Clifford Chance": "#8B0000",
  "Linklaters": "#003082",
  "Freshfields": "#003082",
  "Mishcon": "#1A1A1A",
  "Herbert Smith": "#003082",
  "CMS": "#003082",
  "Siemens": "#009999",
  "Amazon": "#FF9900",
  "Google": "#4285F4",
  "Microsoft": "#00A4EF",
  "Apple": "#1A1A1A",
  "Meta": "#0866FF",
  "HSBC": "#DB0011",
  "Barclays": "#00AEEF",
  "NatWest": "#4C0099",
  "Lloyds": "#006A4D",
  "Seabury": "#00A651",
  "BentallGreenOak": "#1C4C2B",
  "BGO": "#1C4C2B",
  "Bentall": "#1C4C2B",
  "Patrizia": "#E4002B",
  "Redevco": "#003082",
  "LaSalle": "#003082",
  "Picton": "#003082",
  "Tritax": "#1A1A1A",
  "Prologis": "#0033A0",
  "Canary Wharf": "#1A3A6B",
  "Stanhope": "#2C2C2C",
  "abrdn": "#8DC63F",
  "Threadneedle": "#C8102E",
  "Oxford Properties": "#002D62",
  "Norges": "#EF2B2D",
  "GIC": "#003082",
  "TH Real Estate": "#003082",
  "Nuveen Real Estate": "#00558C",
  "Barings": "#8B0000",
  "PGIM Real Estate": "#003DA5",
  "Heitman": "#003082",
  "UBS": "#E60028",
  "Credit Suisse": "#003082",
  "Deutsche Bank": "#003082",
  "Union Investment": "#003082",
  "Deka": "#003082",
  "GLL": "#003082",
  "CBRE Investment": "#006A4D",
  "Savills Investment": "#003057",
  "Knight Frank Investment": "#97272C",
  "JLL Investment": "#E30613",
  "Cushman Investment": "#C8102E",
  "Frogmore": "#003082",
  "Sellar": "#1A1A1A",
  "Renzo Piano": "#1A1A1A",
  "Foster + Partners": "#1A1A1A",
  "Feilden Clegg": "#003082",
  "Penoyre & Prasad": "#003082",
  "Haworth Tompkins": "#8B0000",
  "Allies and Morrison": "#003082",
  "David Chipperfield": "#1A1A1A",
  "Eric Parry": "#1A1A1A",
  "Squire and Partners": "#003082",
  "Caruso St John": "#1A1A1A",
  "Sergison Bates": "#1A1A1A",
  "Duggan Morris": "#1A1A1A",
  "Adam Khan": "#1A1A1A",
  "Real PM": "#003082",
  "Paragon": "#003082",
  "Endurance": "#006747",
  "SH Hotels": "#1A1A1A",
  "Shhotels": "#1A1A1A",
};

const HASH_PALETTE = [
  "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#14b8a6", "#84cc16", "#f97316",
  "#3b82f6", "#a855f7",
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getBubbleColor(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(BRAND_COLORS)) {
    const k = key.toLowerCase();
    if (lower.includes(k) || k.includes(lower)) return color;
  }
  return HASH_PALETTE[hashName(name) % HASH_PALETTE.length];
}

function nodeRadius(contactCount: number): number {
  return Math.max(16, Math.min(28, 12 + contactCount * 1.1));
}

function getBorderColor(dirs: string[]): string {
  if (dirs.length === 1) return DIRECTOR_COLORS[dirs[0]] ?? "#9ca3af";
  if (dirs.length > 1) return "#8b5cf6";
  return "#9ca3af";
}

// ── D3 types ─────────────────────────────────────────────────────────────────

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
  kind: "account" | "director";
  name: string;
  // director-specific
  director?: "dicky" | "joe" | "jesus";
  photo?: string;
  // account fields (optional for director nodes)
  cluster?: string;
  contacts?: ContactNode[];
  contactCount?: number;
  directors?: string[];
  logoUrl?: string;
  accountType?: string;
  domain?: string;
}

interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode;
  target: SimNode;
  strength: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CRMNeuralMap({ compact: _compact }: { compact?: boolean } = {}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const simRef = useRef<d3.Simulation<SimNode, SimEdge> | null>(null);
  const clearSpotlightRef = useRef<() => void>(() => {});
  const spotlightDataRef = useRef<{ accounts: Set<string>; directors: Set<string> } | null>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const updateLabelsRef = useRef<(k: number) => void>(() => {});
  const connectionCardAccountsRef = useRef<Set<string>>(new Set());
  const updateContactLabelRef = useRef<(k: number) => void>(() => {});
  const updateConnectionCardsRef = useRef<(k: number) => void>(() => {});

  const [selectedAccount, setSelectedAccount] = useState<AccountNode | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactNode | null>(null);
  const [selectedDirector, setSelectedDirector] = useState<"dicky" | "joe" | "jesus" | null>(null);
  const [filter, setFilter] = useState<"all" | "dicky" | "joe" | "jesus">("all");
  const [dimensions, setDimensions] = useState({ width: 1200, height: 900 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"all" | "priority" | "search">("all");
  const [searchText, setSearchText] = useState("");
  const [minContacts, setMinContacts] = useState(2);

  // Account type write-back
  const [isSavingType, setIsSavingType] = useState(false);
  const [typeSaveStatus, setTypeSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Contact note
  const [noteText, setNoteText] = useState("");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Convert to lead
  const [isLeadConfirmOpen, setIsLeadConfirmOpen] = useState(false);
  const [leadStatus, setLeadStatus] = useState<"idle" | "converting" | "success" | "error">("idle");
  const [leadUrl, setLeadUrl] = useState("");
  const [leadError, setLeadError] = useState("");

  // Add Contact form
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formDirector, setFormDirector] = useState("");
  const [formAlsoCreateLead, setFormAlsoCreateLead] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSaveStatus, setContactSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Connection search
  const [connectionSearchQuery, setConnectionSearchQuery] = useState("");
  const [connectionSearchResults, setConnectionSearchResults] = useState<{ id: string; name: string; company: string }[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<{ id: string; name: string } | null>(null);
  const [showConnectionDropdown, setShowConnectionDropdown] = useState(false);

  // Logo replace
  const [showLogoReplace, setShowLogoReplace] = useState(false);
  const [logoReplaceMode, setLogoReplaceMode] = useState<"upload" | "url">("upload");
  const [logoUploadFile, setLogoUploadFile] = useState<File | null>(null);
  const [logoUploadPreview, setLogoUploadPreview] = useState("");
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [logoUrlPreviewOk, setLogoUrlPreviewOk] = useState(false);
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoSaveError, setLogoSaveError] = useState("");

  // Add Account
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addAccName, setAddAccName] = useState("");
  const [addAccType, setAddAccType] = useState("");
  const [addAccDomain, setAddAccDomain] = useState("");
  const [addAccSaving, setAddAccSaving] = useState(false);
  const [addAccError, setAddAccError] = useState("");

  // Delete account
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountArchiveContacts, setDeleteAccountArchiveContacts] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

  // Delete contact
  const [showDeleteContactModal, setShowDeleteContactModal] = useState(false);
  const [deletingContact, setDeletingContact] = useState(false);
  const [deleteContactError, setDeleteContactError] = useState("");

  // Contact connections
  const [connAddOpen, setConnAddOpen] = useState(false);
  const [connSearchQuery, setConnSearchQuery] = useState("");
  const [connSearchResults, setConnSearchResults] = useState<{ id: string; name: string; company: string }[]>([]);
  const [connSearchOpen, setConnSearchOpen] = useState(false);

  // Move contact
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveQuery, setMoveQuery] = useState("");
  const [movePending, setMovePending] = useState<{ id: string; name: string } | null>(null);
  const [moveStatus, setMoveStatus] = useState<"idle" | "moving" | "moved" | "error">("idle");
  const [moveError, setMoveError] = useState("");

  const queryClient = useQueryClient();

  // Reset account panel state when account changes
  useEffect(() => {
    setIsSavingType(false);
    setTypeSaveStatus("idle");
    setShowAddForm(false);
    setFormName(""); setFormPosition(""); setFormEmail(""); setFormPhone("");
    setFormNote(""); setFormDirector(""); setFormAlsoCreateLead(false);
    setSelectedConnection(null); setConnectionSearchQuery(""); setConnectionSearchResults([]);
    setContactSaveStatus("idle"); setIsSavingContact(false);
    setShowConnectionDropdown(false);
    setShowLogoReplace(false);
    setLogoUploadFile(null); setLogoUploadPreview("");
    setLogoUrlInput(""); setLogoUrlPreviewOk(false);
    setLogoSaving(false); setLogoSaveError("");
    setShowDeleteAccountModal(false); setDeleteAccountArchiveContacts(false);
    setDeletingAccount(false); setDeleteAccountError("");
  }, [selectedAccount]);

  // Reset contact interaction state
  useEffect(() => {
    setNoteText("");
    setNoteStatus("idle");
    setIsLeadConfirmOpen(false);
    setLeadStatus("idle");
    setLeadUrl("");
    setLeadError("");
    setConnAddOpen(false);
    setConnSearchQuery(""); setConnSearchResults([]); setConnSearchOpen(false);
    setMoveOpen(false); setMoveQuery(""); setMovePending(null);
    setMoveStatus("idle"); setMoveError("");
    setShowDeleteContactModal(false); setDeletingContact(false); setDeleteContactError("");
  }, [selectedContact]);

  // Escape clears all selections
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedAccount(null);
        setSelectedContact(null);
        setSelectedDirector(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Connection search debounce (for "add contact" form)
  useEffect(() => {
    if (!connectionSearchQuery.trim()) {
      setConnectionSearchResults([]);
      setShowConnectionDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/crm/search-contacts?q=${encodeURIComponent(connectionSearchQuery)}&limit=10`);
        if (res.ok) {
          const json = await res.json();
          setConnectionSearchResults(json.contacts || []);
          setShowConnectionDropdown(true);
        }
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(timer);
  }, [connectionSearchQuery]);

  // Conn-add search debounce (for contact panel connections)
  useEffect(() => {
    if (!connSearchQuery.trim() || !selectedContact) {
      setConnSearchResults([]);
      setConnSearchOpen(false);
      return;
    }
    const existing = new Set(selectedContact.connectedToIds ?? []);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/crm/search-contacts?q=${encodeURIComponent(connSearchQuery)}&limit=10`);
        if (res.ok) {
          const json = await res.json();
          const filtered = (json.contacts || []).filter(
            (c: { id: string }) => c.id !== selectedContact.id && !existing.has(c.id)
          );
          setConnSearchResults(filtered);
          setConnSearchOpen(true);
        }
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(timer);
  }, [connSearchQuery, selectedContact]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTypeChange = async (newType: string) => {
    if (!selectedAccount) return;
    setIsSavingType(true);
    setTypeSaveStatus("saving");
    try {
      const res = await fetch("/api/crm/update-account-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount.id, type: newType }),
      });
      if (!res.ok) throw new Error("Failed");
      setTypeSaveStatus("saved");
      setSelectedAccount(prev => prev ? { ...prev, accountType: newType } : null);
      queryClient.invalidateQueries({ queryKey: ["crm-network"] });
      setTimeout(() => setTypeSaveStatus("idle"), 2000);
    } catch {
      setTypeSaveStatus("error");
      setTimeout(() => setTypeSaveStatus("idle"), 3000);
    } finally {
      setIsSavingType(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedContact || !noteText.trim()) return;
    setNoteStatus("saving");
    try {
      const res = await fetch("/api/crm/add-contact-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContact.id, note: noteText }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      setNoteStatus("saved");
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["crm-network"] });
      setTimeout(() => setNoteStatus("idle"), 2000);
    } catch {
      setNoteStatus("error");
      setTimeout(() => setNoteStatus("idle"), 3000);
    }
  };

  const handleConvertToLead = async () => {
    if (!selectedContact || !selectedAccount) return;
    setLeadStatus("converting");
    setIsLeadConfirmOpen(false);
    try {
      const res = await fetch("/api/crm/convert-to-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          contactName: selectedContact.name,
          contactEmail: selectedContact.email,
          contactPhone: selectedContact.phone,
          companyName: selectedAccount.name,
          contactPosition: selectedContact.position,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Create failed");
      setLeadStatus("success");
      setLeadUrl(body.leadUrl || "");
      setTimeout(() => setLeadStatus("idle"), 5000);
    } catch (e) {
      setLeadStatus("error");
      setLeadError(e instanceof Error ? e.message : "Unknown error");
      setTimeout(() => setLeadStatus("idle"), 3000);
    }
  };

  const handleContactClick = (contact: ContactNode) => {
    setSelectedContact(contact);
    setSelectedDirector(null);
  };

  const handleContactBack = () => {
    setSelectedContact(null);
  };

  const handleAddContact = async () => {
    if (!formName.trim() || !selectedAccount) return;
    setIsSavingContact(true);
    setContactSaveStatus("saving");
    try {
      const res = await fetch("/api/crm/add-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount.id.startsWith("syn-") ? undefined : selectedAccount.id,
          accountName: selectedAccount.name,
          name: formName.trim(),
          position: formPosition.trim() || undefined,
          email: formEmail.trim() || undefined,
          phone: formPhone.trim() || undefined,
          note: formNote.trim() || undefined,
          connectedToContactId: selectedConnection?.id,
          director: formDirector || undefined,
          alsoCreateLead: formAlsoCreateLead,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Create failed");
      setContactSaveStatus("saved");
      setShowAddForm(false);
      setFormName(""); setFormPosition(""); setFormEmail(""); setFormPhone("");
      setFormNote(""); setFormDirector(""); setFormAlsoCreateLead(false);
      setSelectedConnection(null); setConnectionSearchQuery(""); setConnectionSearchResults([]);
      queryClient.invalidateQueries({ queryKey: ["crm-network"] });
      setTimeout(() => setContactSaveStatus("idle"), 3000);
    } catch {
      setContactSaveStatus("error");
      setTimeout(() => setContactSaveStatus("idle"), 3000);
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleLogoSave = async () => {
    if (!selectedAccount) return;
    setLogoSaving(true);
    setLogoSaveError("");
    try {
      let logoUrl = "";
      if (logoReplaceMode === "upload") {
        if (!logoUploadFile) throw new Error("No file selected");
        const fd = new FormData();
        fd.append("file", logoUploadFile);
        const uploadRes = await fetch("/api/crm/upload-logo", { method: "POST", body: fd });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
        logoUrl = uploadData.url;
      } else {
        if (!logoUrlInput.trim()) throw new Error("No URL entered");
        logoUrl = logoUrlInput.trim();
      }
      const updateRes = await fetch("/api/crm/update-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount.id, logoUrl }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) throw new Error(updateData.error || "Save failed");
      queryClient.setQueryData(
        ["crm-network"],
        (old: { nodes: AccountNode[]; edges: AccountEdge[] } | undefined) => {
          if (!old) return old;
          return { ...old, nodes: old.nodes.map(n => n.id === selectedAccount.id ? { ...n, logoUrl } : n) };
        },
      );
      setSelectedAccount(prev => prev ? { ...prev, logoUrl } : null);
      setShowLogoReplace(false);
      setLogoUploadFile(null); setLogoUploadPreview("");
      setLogoUrlInput(""); setLogoUrlPreviewOk(false);
    } catch (e) {
      setLogoSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLogoSaving(false);
    }
  };

  const handleAddAccount = async () => {
    if (!addAccName.trim()) return;
    setAddAccSaving(true);
    setAddAccError("");
    try {
      const res = await fetch("/api/crm/add-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addAccName.trim(),
          type: addAccType || null,
          domain: addAccDomain.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Create failed");
      queryClient.setQueryData(
        ["crm-network"],
        (old: { nodes: AccountNode[]; edges: AccountEdge[] } | undefined) => {
          if (!old) return old;
          return { ...old, nodes: [...old.nodes, body.account] };
        },
      );
      setMinContacts(0); // show newly created 0-contact account
      setShowAddAccount(false);
      setAddAccName(""); setAddAccType(""); setAddAccDomain("");
    } catch (e) {
      setAddAccError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setAddAccSaving(false);
    }
  };

  const handleAddConnection = async (connectedContactId: string) => {
    if (!selectedContact) return;
    try {
      const res = await fetch("/api/crm/add-contact-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContact.id, connectedContactId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      const newConnIds: string[] = body.connectedToIds;
      queryClient.setQueryData(
        ["crm-network"],
        (old: { nodes: AccountNode[]; edges: AccountEdge[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            nodes: old.nodes.map(n => ({
              ...n,
              contacts: n.contacts.map(c =>
                c.id === selectedContact.id ? { ...c, connectedToIds: newConnIds } : c
              ),
            })),
          };
        },
      );
      setSelectedContact(prev => prev ? { ...prev, connectedToIds: newConnIds } : null);
      setConnAddOpen(false);
      setConnSearchQuery(""); setConnSearchResults([]);
    } catch { /* silent */ }
  };

  const handleRemoveConnection = async (connectedContactId: string) => {
    if (!selectedContact) return;
    try {
      const res = await fetch("/api/crm/remove-contact-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContact.id, connectedContactId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed");
      const newConnIds: string[] = body.connectedToIds;
      queryClient.setQueryData(
        ["crm-network"],
        (old: { nodes: AccountNode[]; edges: AccountEdge[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            nodes: old.nodes.map(n => ({
              ...n,
              contacts: n.contacts.map(c =>
                c.id === selectedContact.id ? { ...c, connectedToIds: newConnIds } : c
              ),
            })),
          };
        },
      );
      setSelectedContact(prev => prev ? { ...prev, connectedToIds: newConnIds } : null);
    } catch { /* silent */ }
  };

  const handleMoveContact = async () => {
    if (!selectedContact || !movePending) return;
    setMoveStatus("moving");
    const oldAccountId = lookupMaps.contactToAccountId.get(selectedContact.id);
    try {
      const res = await fetch("/api/crm/move-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContact.id, newAccountId: movePending.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Move failed");
      queryClient.setQueryData(
        ["crm-network"],
        (old: { nodes: AccountNode[]; edges: AccountEdge[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            nodes: old.nodes.map(n => {
              if (n.id === oldAccountId) {
                const updated = n.contacts.filter(c => c.id !== selectedContact.id);
                return { ...n, contacts: updated, contactCount: updated.length };
              }
              if (n.id === movePending.id) {
                const updated = [...n.contacts, selectedContact];
                return { ...n, contacts: updated, contactCount: updated.length };
              }
              return n;
            }),
          };
        },
      );
      setMoveStatus("moved");
      setMoveOpen(false);
      setMovePending(null);
      setTimeout(() => setSelectedContact(null), 1200);
    } catch (e) {
      setMoveStatus("error");
      setMoveError(e instanceof Error ? e.message : "Move failed");
      setTimeout(() => { setMoveStatus("idle"); setMoveError(""); }, 3000);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccount) return;
    setDeletingAccount(true);
    setDeleteAccountError("");
    try {
      const res = await fetch("/api/crm/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccount.id,
          archiveContacts: deleteAccountArchiveContacts,
          contactIds: selectedAccount.contacts.map(c => c.id),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Delete failed");

      const removedId = selectedAccount.id;
      const archivedContactIds = deleteAccountArchiveContacts
        ? new Set(selectedAccount.contacts.map(c => c.id))
        : new Set<string>();

      queryClient.setQueryData(
        ["crm-network"],
        (old: { nodes: AccountNode[]; edges: AccountEdge[] } | undefined) => {
          if (!old) return old;
          let nodes = old.nodes.filter(n => n.id !== removedId);
          if (archivedContactIds.size > 0) {
            nodes = nodes.map(n => {
              const filtered = n.contacts.filter(c => !archivedContactIds.has(c.id));
              return { ...n, contacts: filtered, contactCount: filtered.length };
            });
          }
          const edges = old.edges.filter(e => e.source !== removedId && e.target !== removedId);
          return { nodes, edges };
        },
      );
      setShowDeleteAccountModal(false);
      setSelectedAccount(null);
    } catch (e) {
      setDeleteAccountError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedContact) return;
    setDeletingContact(true);
    setDeleteContactError("");
    try {
      const res = await fetch("/api/crm/delete-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedContact.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Delete failed");

      const deletedId = selectedContact.id;
      queryClient.setQueryData(
        ["crm-network"],
        (old: { nodes: AccountNode[]; edges: AccountEdge[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            nodes: old.nodes.map(n => {
              const filtered = n.contacts.filter(c => c.id !== deletedId);
              return {
                ...n,
                contacts: filtered.map(c => ({
                  ...c,
                  connectedToIds: (c.connectedToIds ?? []).filter(id => id !== deletedId),
                })),
                contactCount: filtered.length,
              };
            }),
          };
        },
      );
      setShowDeleteContactModal(false);
      setSelectedContact(null);
    } catch (e) {
      setDeleteContactError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingContact(false);
    }
  };

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data, isLoading, error } = useQuery({
    queryKey: ["crm-network"],
    queryFn: async () => {
      const res = await fetch("/api/crm");
      if (!res.ok) throw new Error("Failed to fetch CRM data");
      return res.json() as Promise<{ nodes: AccountNode[]; edges: AccountEdge[] }>;
    },
    staleTime: 1000 * 60 * 5,
  });

  // ── Dimension tracking ────────────────────────────────────────────────────

  useEffect(() => {
    const update = () => {
      if (svgRef.current?.parentElement) {
        const w = svgRef.current.parentElement.getBoundingClientRect().width;
        if (w > 0) setDimensions({ width: w, height: 900 });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (svgRef.current?.parentElement) {
        const w = svgRef.current.parentElement.getBoundingClientRect().width;
        if (w > 0) setDimensions({ width: w, height: 900 });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    setTimeout(() => {
      simRef.current?.alphaTarget(0.3).restart();
      setTimeout(() => simRef.current?.alphaTarget(0), 1500);
    }, 100);
  };

  // ── Filtered nodes / edges ────────────────────────────────────────────────

  const filteredNodes = useMemo(() => {
    let nodes = data?.nodes ?? [];
    if (filter !== "all") nodes = nodes.filter(n => n.directors.includes(filter));
    if (viewMode === "priority") {
      nodes = nodes.filter(n => n.contactCount >= Math.max(2, minContacts));
    } else if (viewMode === "search") {
      if (searchText.trim()) {
        const q = searchText.toLowerCase();
        nodes = nodes.filter(n => n.name.toLowerCase().includes(q));
      }
    } else {
      nodes = nodes.filter(n => n.contactCount >= minContacts);
    }
    return nodes;
  }, [data, filter, viewMode, searchText, minContacts]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return (data?.edges ?? []).filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [data, filteredNodes]);

  const effectiveMin = viewMode === "priority" ? Math.max(2, minContacts) : minContacts;

  // ── Per-account Y scores (recency + known) ────────────────────────────────

  const accountYScores = useMemo(() => {
    const maxContactCount = Math.max(1, ...filteredNodes.map(n => n.contactCount));
    const now = Date.now();
    const scores = new Map<string, number>();
    for (const n of filteredNodes) {
      let recencyScore = 0;
      const latest = n.contacts
        .map(c => c.lastContacted ? new Date(c.lastContacted).getTime() : 0)
        .filter(t => t > 0)
        .reduce((a, b) => Math.max(a, b), 0);
      if (latest > 0) {
        const daysSince = (now - latest) / (1000 * 60 * 60 * 24);
        recencyScore = Math.max(0, 1 - daysSince / 180);
      }
      const knownScore = (n.contactCount ?? 0) / maxContactCount;
      scores.set(n.id, recencyScore * 0.6 + knownScore * 0.4);
    }
    return scores;
  }, [filteredNodes]);

  // ── Lookup maps (from all data) ───────────────────────────────────────────

  const lookupMaps = useMemo(() => {
    const contactToAccountId = new Map<string, string>();
    const accountToContactIds = new Map<string, Set<string>>();
    const contactConnections = new Map<string, Set<string>>();
    const directorToContactIds = new Map<string, Set<string>>();
    const contactById = new Map<string, ContactNode>();

    for (const account of (data?.nodes ?? [])) {
      const cids = new Set<string>();
      for (const contact of account.contacts) {
        contactToAccountId.set(contact.id, account.id);
        cids.add(contact.id);
        contactConnections.set(contact.id, new Set(contact.connectedToIds));
        contactById.set(contact.id, contact);
        for (const dir of (contact.directors ?? [])) {
          if (!directorToContactIds.has(dir)) directorToContactIds.set(dir, new Set());
          directorToContactIds.get(dir)!.add(contact.id);
        }
      }
      accountToContactIds.set(account.id, cids);
    }

    return { contactToAccountId, accountToContactIds, contactConnections, directorToContactIds, contactById };
  }, [data]);

  // ── Spotlight data ────────────────────────────────────────────────────────

  const spotlightData = useMemo((): { accounts: Set<string>; directors: Set<string> } | null => {
    const visibleIds = new Set(filteredNodes.map(n => n.id));

    if (selectedDirector) {
      const accountIds = new Set<string>();
      for (const account of filteredNodes) {
        if ((account.directors ?? []).includes(selectedDirector)) accountIds.add(account.id);
      }
      return { accounts: accountIds, directors: new Set([`director-${selectedDirector}`]) };
    }

    if (selectedContact) {
      const accountIds = new Set<string>();
      const directorIds = new Set<string>();

      const myAcc = lookupMaps.contactToAccountId.get(selectedContact.id);
      if (myAcc && visibleIds.has(myAcc)) accountIds.add(myAcc);

      for (const dir of (selectedContact.directors ?? [])) directorIds.add(`director-${dir}`);

      const conns = lookupMaps.contactConnections.get(selectedContact.id) ?? new Set<string>();
      for (const cid of conns) {
        const acc = lookupMaps.contactToAccountId.get(cid);
        if (acc && visibleIds.has(acc)) accountIds.add(acc);
      }

      return (accountIds.size > 0 || directorIds.size > 0) ? { accounts: accountIds, directors: directorIds } : null;
    }

    if (selectedAccount) {
      const accountIds = new Set<string>([selectedAccount.id]);
      const directorIds = new Set<string>();

      for (const dir of (selectedAccount.directors ?? [])) directorIds.add(`director-${dir}`);

      const myContacts = lookupMaps.accountToContactIds.get(selectedAccount.id) ?? new Set<string>();
      for (const cid of myContacts) {
        const conns = lookupMaps.contactConnections.get(cid) ?? new Set<string>();
        for (const oid of conns) {
          const acc = lookupMaps.contactToAccountId.get(oid);
          if (acc && visibleIds.has(acc)) accountIds.add(acc);
        }
      }

      return { accounts: accountIds, directors: directorIds };
    }

    return null;
  }, [selectedDirector, selectedContact, selectedAccount, filteredNodes, lookupMaps]);

  // ── Connected companies (for contact detail panel) ────────────────────────

  const connectedCompanies = useMemo(() => {
    if (!selectedContact) return [];
    const companies: { id: string; name: string }[] = [];
    const seen = new Set<string>();
    for (const cid of (selectedContact.connectedToIds ?? [])) {
      const accountId = lookupMaps.contactToAccountId.get(cid);
      if (accountId && !seen.has(accountId)) {
        seen.add(accountId);
        const account = data?.nodes.find(n => n.id === accountId);
        if (account) companies.push({ id: accountId, name: account.name });
      }
    }
    return companies;
  }, [selectedContact, lookupMaps, data]);

  // ── Connection cards data (account → contacts to show when contact spotlit) ─

  const connectionCards = useMemo(() => {
    type CardEntry = { id: string; name: string; isSelf: boolean; dirColor?: string };
    if (!selectedContact || !spotlightData) return new Map<string, CardEntry[]>();

    const myAccountId = lookupMaps.contactToAccountId.get(selectedContact.id);
    const myDirColor = selectedContact.directors?.[0]
      ? DIRECTOR_COLORS[selectedContact.directors[0]]
      : undefined;
    const cards = new Map<string, CardEntry[]>();

    for (const accountId of spotlightData.accounts) {
      const entries: CardEntry[] = [];

      if (accountId === myAccountId) {
        entries.push({ id: selectedContact.id, name: selectedContact.name, isSelf: true, dirColor: myDirColor });
      }

      for (const connId of (selectedContact.connectedToIds ?? [])) {
        if (lookupMaps.contactToAccountId.get(connId) === accountId) {
          const conn = lookupMaps.contactById.get(connId);
          if (conn) entries.push({ id: connId, name: conn.name, isSelf: false });
        }
      }

      if (entries.length > 0) cards.set(accountId, entries);
    }

    return cards;
  }, [selectedContact, spotlightData, lookupMaps]);

  // ── Director panel stats ──────────────────────────────────────────────────

  const directorStats = useMemo(() => {
    if (!selectedDirector) return null;
    const dirConfig = DIRECTOR_NODES.find(d => d.director === selectedDirector);
    const contactIds = lookupMaps.directorToContactIds.get(selectedDirector) ?? new Set<string>();
    const totalContacts = contactIds.size;

    const accountContactCounts = new Map<string, { account: AccountNode; count: number }>();
    for (const account of (data?.nodes ?? [])) {
      let count = 0;
      for (const contact of account.contacts) {
        if (contactIds.has(contact.id)) count++;
      }
      if (count > 0) accountContactCounts.set(account.id, { account, count });
    }

    const topAccounts = Array.from(accountContactCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { dirConfig, totalContacts, totalAccounts: accountContactCounts.size, topAccounts };
  }, [selectedDirector, lookupMaps, data]);

  // ── Type distribution diagnostic log ─────────────────────────────────────

  useEffect(() => {
    if (!data?.nodes) return;
    const dist = new Map<string, number>();
    for (const n of data.nodes) {
      const t = n.accountType || "(empty)";
      dist.set(t, (dist.get(t) ?? 0) + 1);
    }
    const sorted = [...dist.entries()].sort((a, b) => b[1] - a[1]);
    console.log("[CRM Neural Map] Type distribution:", Object.fromEntries(sorted));
    // Sample raw types to confirm format (helps debug if contractor matching fails)
    const sample = data.nodes.slice(0, 8).map(n => ({ name: n.name, accountType: n.accountType || "(empty)" }));
    console.log("[CRM Neural Map] Raw accountType sample:", sample);
    const contractorCount = dist.get("Contractor") ?? dist.get("contractor") ?? 0;
    if (contractorCount === 0)
      console.warn("[CRM Neural Map] No contractor accounts detected — check accountType values above");
    else
      console.log(`[CRM Neural Map] Contractor count: ${contractorCount}`);
  }, [data]);

  // ── Keep spotlightDataRef in sync ─────────────────────────────────────────

  useEffect(() => {
    spotlightDataRef.current = spotlightData;
  }, [spotlightData]);

  // ── Spotlight opacity effect ──────────────────────────────────────────────

  useEffect(() => {
    if (!gRef.current) return;
    const groups = d3.select(gRef.current).selectAll<SVGGElement, SimNode>(".node-group");
    const linkLines = d3.select(gRef.current).select<SVGGElement>(".links-layer")
      .selectAll<SVGLineElement, SimEdge>("line");

    if (spotlightData === null) {
      groups.transition().duration(300).attr("opacity", 1);
      linkLines.transition().duration(300).attr("stroke-opacity", 0);
    } else {
      groups.transition().duration(300).attr("opacity", (d: SimNode) =>
        d.kind === "director"
          ? spotlightData.directors.has(d.id) ? 1 : 0.15
          : spotlightData.accounts.has(d.id) ? 1 : 0.12
      );
      linkLines.transition().duration(300).attr("stroke-opacity", (d: SimEdge) => {
        const srcId = (d.source as SimNode).id;
        const tgtId = (d.target as SimNode).id;
        return (spotlightData.accounts.has(srcId) && spotlightData.accounts.has(tgtId)) ? 0.5 : 0;
      });
    }
  }, [spotlightData]);

  // ── Pathway lines effect ──────────────────────────────────────────────────

  useEffect(() => {
    if (!gRef.current) return;
    const pathwaysLayer = d3.select(gRef.current).select<SVGGElement>(".pathways-layer");
    if (pathwaysLayer.empty()) return;
    pathwaysLayer.selectAll("*").remove();

    if (!spotlightData || !selectedContact || simNodesRef.current.length === 0) return;

    const fromAccountId = lookupMaps.contactToAccountId.get(selectedContact.id);
    const fromNode = fromAccountId ? simNodesRef.current.find(n => n.id === fromAccountId) : undefined;
    if (!fromNode || fromNode.x == null || fromNode.y == null) return;

    // Lines to connected accounts
    for (const relatedId of spotlightData.accounts) {
      if (relatedId === fromNode.id) continue;
      const toNode = simNodesRef.current.find(n => n.id === relatedId);
      if (!toNode || toNode.x == null || toNode.y == null) continue;
      pathwaysLayer.append("line")
        .attr("x1", fromNode.x!).attr("y1", fromNode.y!)
        .attr("x2", toNode.x!).attr("y2", toNode.y!)
        .attr("stroke", "#6366f1")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4 6")
        .attr("stroke-opacity", 0.7)
        .attr("pointer-events", "none");
    }

    // Lines to owning directors
    for (const dirNodeId of spotlightData.directors) {
      const dirNode = simNodesRef.current.find(n => n.id === dirNodeId);
      if (!dirNode || dirNode.x == null || dirNode.y == null) continue;
      const dirKey = dirNodeId.replace("director-", "");
      pathwaysLayer.append("line")
        .attr("x1", fromNode.x!).attr("y1", fromNode.y!)
        .attr("x2", dirNode.x!).attr("y2", dirNode.y!)
        .attr("stroke", DIRECTOR_COLORS[dirKey] ?? "#6b7280")
        .attr("stroke-width", 2.5)
        .attr("stroke-opacity", 0.8)
        .attr("pointer-events", "none");
    }
  }, [spotlightData, selectedContact, lookupMaps]);

  // ── Contact name label ────────────────────────────────────────────────────

  useEffect(() => {
    if (!gRef.current) return;
    const labelLayer = d3.select(gRef.current).select<SVGGElement>(".contact-label-layer");
    if (labelLayer.empty()) return;
    labelLayer.selectAll("*").remove();
    updateContactLabelRef.current = () => {};
    if (!selectedContact || simNodesRef.current.length === 0) return;

    const accountId = lookupMaps.contactToAccountId.get(selectedContact.id);
    const accountNode = accountId ? simNodesRef.current.find(n => n.id === accountId) : undefined;
    if (!accountNode || accountNode.x == null || accountNode.y == null) return;

    const radius = nodeRadius(accountNode.contactCount ?? 0);
    const owningDirector = (selectedContact.directors ?? [])[0];
    const fillColor = owningDirector ? (DIRECTOR_COLORS[owningDirector] ?? "#6b7280") : "#6b7280";
    const cx = accountNode.x, cy = accountNode.y + radius + 16;
    const k0 = svgRef.current ? d3.zoomTransform(svgRef.current).k : 1;

    const textEl = labelLayer.append("text")
      .attr("transform", `translate(${cx},${cy}) scale(${1 / k0})`)
      .attr("text-anchor", "middle")
      .attr("font-size", 12)
      .attr("font-family", "Poppins, sans-serif")
      .attr("font-weight", "600")
      .attr("fill", fillColor)
      .attr("stroke", "white")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke")
      .attr("pointer-events", "none")
      .text(selectedContact.name);

    updateContactLabelRef.current = (k: number) => {
      textEl.attr("transform", `translate(${cx},${cy}) scale(${1 / k})`);
    };
  }, [selectedContact, lookupMaps]);

  // ── Connection cards D3 layer ─────────────────────────────────────────────

  useEffect(() => {
    if (!gRef.current) return;
    const cardsLayer = d3.select(gRef.current).select<SVGGElement>(".connection-cards-layer");
    if (cardsLayer.empty()) return;
    cardsLayer.selectAll("*").remove();
    updateConnectionCardsRef.current = () => {};

    // Update which accounts have cards (suppresses their text labels)
    connectionCardAccountsRef.current = new Set(connectionCards.keys());
    if (svgRef.current) {
      const k = d3.zoomTransform(svgRef.current).k;
      updateLabelsRef.current(k);
    }

    if (connectionCards.size === 0) return;

    const LINE_H = 17;
    const PAD_X = 8;
    const PAD_Y = 5;
    const MAX_LINES = 5;

    for (const [accountId, entries] of connectionCards.entries()) {
      const node = simNodesRef.current.find(n => n.id === accountId);
      if (!node || node.x == null || node.y == null) continue;

      const radius = nodeRadius(node.contactCount ?? 0);
      const displayEntries = entries.slice(0, MAX_LINES);
      const overflow = entries.length - MAX_LINES;

      const cardW = Math.min(200, Math.max(80,
        Math.max(...displayEntries.map(e => e.name.length * 6.4)) + PAD_X * 2 + 10
      ));
      const cardH = (displayEntries.length + (overflow > 0 ? 1 : 0)) * LINE_H + PAD_Y * 2;

      const cardCx = node.x, cardCy = node.y + radius + 8;
      const k0 = svgRef.current ? d3.zoomTransform(svgRef.current).k : 1;
      const cardG = cardsLayer.append("g")
        .attr("class", "connection-card")
        .attr("data-cx", String(cardCx))
        .attr("data-cy", String(cardCy))
        .attr("transform", `translate(${cardCx},${cardCy}) scale(${1 / k0})`);

      // Background
      cardG.append("rect")
        .attr("x", -cardW / 2).attr("y", 0)
        .attr("width", cardW).attr("height", cardH)
        .attr("rx", 8).attr("ry", 8)
        .attr("fill", "rgba(255,255,255,0.93)")
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1)
        .style("filter", "drop-shadow(0 4px 12px rgba(15,23,42,0.08))")
        .attr("pointer-events", "none");

      // Name rows
      displayEntries.forEach((entry, i) => {
        const rowY = PAD_Y + i * LINE_H;

        const rowG = cardG.append("g").style("cursor", "pointer");

        // Hover bg
        rowG.append("rect")
          .attr("class", "card-row-bg")
          .attr("x", -cardW / 2 + 2).attr("y", rowY)
          .attr("width", cardW - 4).attr("height", LINE_H)
          .attr("rx", 4).attr("fill", "transparent");

        // Coloured dot for own-account entry
        if (entry.isSelf && entry.dirColor) {
          rowG.append("circle")
            .attr("cx", -cardW / 2 + PAD_X)
            .attr("cy", rowY + LINE_H / 2)
            .attr("r", 3)
            .attr("fill", entry.dirColor)
            .attr("pointer-events", "none");
        }

        const maxChars = Math.floor((cardW - PAD_X * 2 - (entry.isSelf && entry.dirColor ? 10 : 0)) / 6.4);
        const label = entry.name.length > maxChars ? entry.name.slice(0, maxChars - 1) + "…" : entry.name;

        rowG.append("text")
          .attr("x", 0)
          .attr("y", rowY + LINE_H / 2 + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", 11)
          .attr("font-family", "Poppins, sans-serif")
          .attr("font-weight", entry.isSelf ? "600" : "500")
          .attr("fill", entry.isSelf ? "#111827" : "#1f2937")
          .attr("pointer-events", "none")
          .text(label);

        rowG
          .on("mouseenter", function(this: SVGGElement) {
            d3.select(this).select(".card-row-bg").attr("fill", "#f1f5f9");
          })
          .on("mouseleave", function(this: SVGGElement) {
            d3.select(this).select(".card-row-bg").attr("fill", "transparent");
          })
          .on("click", (event: Event) => {
            event.stopPropagation();
            const contact = lookupMaps.contactById.get(entry.id);
            if (contact) {
              setSelectedContact(contact);
              setSelectedAccount(null);
              setSelectedDirector(null);
            }
          });
      });

      // "+ N more" overflow line
      if (overflow > 0) {
        const overflowY = PAD_Y + displayEntries.length * LINE_H;
        cardG.append("text")
          .attr("x", 0)
          .attr("y", overflowY + LINE_H / 2 + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", 10)
          .attr("font-family", "Poppins, sans-serif")
          .attr("fill", "#9ca3af")
          .attr("pointer-events", "none")
          .text(`+ ${overflow} more`);
      }
    }

    updateConnectionCardsRef.current = (k: number) => {
      cardsLayer.selectAll<SVGGElement, unknown>(".connection-card").each(function() {
        const el = d3.select(this);
        const cx = parseFloat(el.attr("data-cx") || "0");
        const cy = parseFloat(el.attr("data-cy") || "0");
        el.attr("transform", `translate(${cx},${cy}) scale(${1 / k})`);
      });
    };
  }, [connectionCards, lookupMaps]);

  // ── D3 simulation ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!filteredNodes.length || !svgRef.current || !gRef.current) return;

    clearSpotlightRef.current = () => {
      setSelectedAccount(null);
      setSelectedContact(null);
      setSelectedDirector(null);
    };

    const { width, height } = dimensions;

    const typeLane = (accountType: string | undefined): "client"|"consultant"|"agent"|"contractor"|"untyped" => {
      const t = (accountType || "").toLowerCase().trim();
      if (t === "client") return "client";
      if (t === "consultant") return "consultant";
      if (t === "agent") return "agent";
      if (t === "contractor") return "contractor";
      return "untyped";
    };

    // Force targets = cluster centres
    const CLUSTERS: Record<"untyped"|"consultant"|"agent"|"client"|"contractor", { x: number; y: number }> = {
      agent:      { x: 0.36 * width, y: 0.10 * height },
      consultant: { x: 0.36 * width, y: 0.48 * height },
      client:     { x: 0.82 * width, y: 0.50 * height },
      contractor: { x: 0.36 * width, y: 0.93 * height },
      untyped:    { x: 0.16 * width, y: 0.50 * height },
    };

    // Circular cluster bounds — bubbles snapped back along radial line on each tick
    type Circle = { cx: number; cy: number; maxRadius: number };
    const CIRCLES: Record<"agent"|"consultant"|"client"|"contractor"|"untyped", Circle> = {
      agent:      { cx: 0.36 * width, cy: 0.10 * height,  maxRadius: 110 },
      consultant: { cx: 0.36 * width, cy: 0.48 * height,  maxRadius: 240 },
      client:     { cx: 0.82 * width, cy: 0.50 * height,  maxRadius: 220 },
      contractor: { cx: 0.36 * width, cy: 0.93 * height,  maxRadius: 70  },
      untyped:    { cx: 0.16 * width, cy: 0.50 * height,  maxRadius: 100 },
    };

    // Director nodes — fy pins Y, forceX pulls to far-left edge (no fx)
    const dirFy = [280, 480, 680]; // pixel positions in 900px canvas
    const directorSimNodes: SimNode[] = DIRECTOR_NODES.map((d, i) => ({
      id: d.id,
      kind: "director" as const,
      name: d.name,
      director: d.director,
      photo: d.photo,
      fy: dirFy[i],
      x: 60,
      y: dirFy[i],
      vx: 0,
      vy: 0,
    }));

    const accountSimNodes: SimNode[] = filteredNodes.map(n => ({
      ...n,
      kind: "account" as const,
      x: CLUSTERS[typeLane(n.accountType)].x + (Math.random() - 0.5) * 100,
      y: CLUSTERS[typeLane(n.accountType)].y + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0,
    }));

    const simNodes: SimNode[] = [...directorSimNodes, ...accountSimNodes];
    simNodesRef.current = simNodes;

    const nodeById = new Map(simNodes.map(n => [n.id, n]));
    const simEdges: SimEdge[] = filteredEdges
      .map(e => {
        const src = nodeById.get(e.source);
        const tgt = nodeById.get(e.target);
        if (!src || !tgt) return null;
        return { source: src, target: tgt, strength: e.strength } as SimEdge;
      })
      .filter((e): e is SimEdge => e !== null);

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    g.selectAll("*").remove();
    svg.selectAll(".pill-overlay").remove();

    // Placeholders — reassigned after their selections are created
    let updateLabels: (k: number) => void = () => {};
    let updatePillPositions: (t: d3.ZoomTransform) => void = () => {};

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .wheelDelta(event => -event.deltaY * 0.001)
      .on("zoom", event => {
        g.attr("transform", event.transform);
        updateLabels(event.transform.k);
        updatePillPositions(event.transform);
        updateContactLabelRef.current(event.transform.k);
        updateConnectionCardsRef.current(event.transform.k);
      });
    svg.call(zoom);

    // Defs
    const defs = g.append("defs");
    const directorRadius = 50;

    // Drop-shadow filter for pill labels
    const pillFilter = defs.append("filter")
      .attr("id", "pill-shadow")
      .attr("x", "-30%").attr("y", "-80%")
      .attr("width", "160%").attr("height", "260%");
    pillFilter.append("feDropShadow")
      .attr("dx", 0).attr("dy", 4)
      .attr("stdDeviation", 6)
      .attr("flood-color", "rgba(15,23,42,0.08)")
      .attr("flood-opacity", 1);

    accountSimNodes.forEach(n => {
      if (!n.logoUrl) return;
      defs.append("clipPath")
        .attr("id", `clip-${n.id}`)
        .append("circle")
        .attr("r", nodeRadius(n.contactCount ?? 0) - 4)
        .attr("cx", 0).attr("cy", 0);
    });

    DIRECTOR_NODES.forEach(d => {
      defs.append("clipPath")
        .attr("id", `clip-${d.id}`)
        .append("circle")
        .attr("r", directorRadius - 3)
        .attr("cx", 0).attr("cy", 0);
    });

    // Background click
    g.append("rect")
      .attr("x", -5000).attr("y", -5000)
      .attr("width", 10000).attr("height", 10000)
      .attr("fill", "transparent")
      .style("cursor", "default")
      .on("click", () => clearSpotlightRef.current());

    // Pathway lines layer (populated by spotlight effect)
    g.append("g").attr("class", "pathways-layer");

    // Contact label layer (populated by selectedContact effect)
    g.append("g").attr("class", "contact-label-layer");

    // Links
    const links = g.append("g")
      .attr("class", "links-layer")
      .selectAll<SVGLineElement, SimEdge>("line")
      .data(simEdges)
      .join("line")
      .attr("stroke", "#9ca3af")
      .attr("stroke-opacity", 0)
      .attr("stroke-width", 1);

    // All node groups
    const nodeGroups = g.append("g")
      .attr("class", "nodes-layer")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("class", "node-group")
      .attr("data-id", d => d.id)
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.kind === "director") {
          setSelectedDirector(d.director ?? null);
          setSelectedAccount(null);
          setSelectedContact(null);
        } else {
          setSelectedAccount(d as unknown as AccountNode);
          setSelectedContact(null);
          setSelectedDirector(null);
        }
      });

    // ── Account node rendering ───────────────────────────────────────────

    nodeGroups.filter(d => d.kind === "account")
      .append("circle")
      .attr("r", d => nodeRadius(d.contactCount ?? 0) + 3)
      .attr("fill", d => getBorderColor(d.directors ?? []))
      .attr("opacity", 0.95);

    nodeGroups.filter(d => d.kind === "account")
      .append("circle")
      .attr("r", d => nodeRadius(d.contactCount ?? 0))
      .attr("fill", "#ffffff");

    nodeGroups.filter(d => d.kind === "account")
      .append("circle")
      .attr("class", "no-logo-fill")
      .attr("r", d => nodeRadius(d.contactCount ?? 0) - 1)
      .attr("fill", d => getBubbleColor(d.name))
      .attr("opacity", 0.92);

    nodeGroups.filter(d => d.kind === "account" && !!d.logoUrl)
      .append("image")
      .attr("href", d => d.logoUrl ?? "")
      .attr("x", d => -(nodeRadius(d.contactCount ?? 0) - 4))
      .attr("y", d => -(nodeRadius(d.contactCount ?? 0) - 4))
      .attr("width", d => (nodeRadius(d.contactCount ?? 0) - 4) * 2)
      .attr("height", d => (nodeRadius(d.contactCount ?? 0) - 4) * 2)
      .attr("clip-path", d => `url(#clip-${d.id})`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("pointer-events", "none")
      .on("load", function() {
        const parent = (this as SVGImageElement).parentNode as SVGGElement;
        d3.select(parent).selectAll(".no-logo-fill, .no-logo-initials").style("display", "none");
      })
      .on("error", function() {
        d3.select(this as SVGImageElement).style("display", "none");
      });

    nodeGroups.filter(d => d.kind === "account")
      .append("text")
      .attr("class", "no-logo-initials")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", d => nodeRadius(d.contactCount ?? 0) * 0.42)
      .attr("font-family", "Poppins, sans-serif")
      .attr("font-weight", "700")
      .attr("fill", "#ffffff")
      .attr("pointer-events", "none")
      .text(d => d.name.split(/\s+/).map((w: string) => w[0]?.toUpperCase()).filter(Boolean).slice(0, 3).join(""));

    nodeGroups.filter(d => d.kind === "account" && (d.contactCount ?? 0) > 0)
      .append("circle")
      .attr("cx", d => nodeRadius(d.contactCount ?? 0) - 6)
      .attr("cy", d => -nodeRadius(d.contactCount ?? 0) + 6)
      .attr("r", 9)
      .attr("fill", "#e02020");

    nodeGroups.filter(d => d.kind === "account" && (d.contactCount ?? 0) > 0)
      .append("text")
      .attr("x", d => nodeRadius(d.contactCount ?? 0) - 6)
      .attr("y", d => -nodeRadius(d.contactCount ?? 0) + 6)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", 8)
      .attr("fill", "white")
      .attr("font-weight", "bold")
      .attr("pointer-events", "none")
      .text(d => String(d.contactCount ?? 0));

    // ── Director node rendering ──────────────────────────────────────────

    nodeGroups.filter(d => d.kind === "director")
      .append("circle")
      .attr("r", directorRadius + 4)
      .attr("fill", d => DIRECTOR_NODES.find(x => x.id === d.id)?.color ?? "#666")
      .attr("opacity", 1);

    nodeGroups.filter(d => d.kind === "director")
      .append("circle")
      .attr("r", directorRadius)
      .attr("fill", "#ffffff");

    nodeGroups.filter(d => d.kind === "director")
      .append("image")
      .attr("href", d => d.photo ?? "")
      .attr("x", -(directorRadius - 3))
      .attr("y", -(directorRadius - 3))
      .attr("width", (directorRadius - 3) * 2)
      .attr("height", (directorRadius - 3) * 2)
      .attr("clip-path", d => `url(#clip-${d.id})`)
      .attr("preserveAspectRatio", "xMidYMid slice")
      .style("pointer-events", "none")
      .on("error", function() {
        d3.select(this as SVGImageElement).style("display", "none");
      });

    nodeGroups.filter(d => d.kind === "director")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", directorRadius + 18)
      .attr("font-size", 13)
      .attr("font-family", "Poppins, sans-serif")
      .attr("font-weight", "700")
      .attr("fill", d => DIRECTOR_NODES.find(x => x.id === d.id)?.color ?? "#374151")
      .attr("pointer-events", "none")
      .text(d => d.name);

    // ── Drag (account nodes only) ────────────────────────────────────────

    const drag = d3.drag<SVGGElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simRef.current?.alphaTarget(0.3).restart();
        d.fx = d.x; d.fy = d.y;
      })
      .on("drag", (event, d) => { d.fx = event.x; d.fy = event.y; })
      .on("end", (event, d) => {
        if (!event.active) simRef.current?.alphaTarget(0);
        if (d.kind !== "director") { d.fx = null; d.fy = null; }
      });

    nodeGroups.filter(d => d.kind === "account").call(drag as never);

    // Re-apply spotlight after rebuild
    if (spotlightDataRef.current) {
      const sd = spotlightDataRef.current;
      nodeGroups.attr("opacity", (d: SimNode) =>
        d.kind === "director"
          ? sd.directors.has(d.id) ? 1 : 0.15
          : sd.accounts.has(d.id) ? 1 : 0.12
      );
    }

    // ── Cluster pill labels — non-zoomed overlay (appended to SVG, not g) ──

    const pillOverlay = svg.append("g")
      .attr("class", "pill-overlay")
      .attr("pointer-events", "none");

    const OVERLAY_PILL_DEFS = [
      { key: "directors",   label: "DIRECTORS",   dataX: 60,             screenY: 200 },
      { key: "agents",      label: "AGENTS",       dataX: 0.36 * width,  screenY: 0.10 * height - 90 },
      { key: "consultants", label: "CONSULTANTS",  dataX: 0.36 * width,  screenY: 0.48 * height - 270 },
      { key: "clients",     label: "CLIENTS",      dataX: 0.82 * width,  screenY: 0.50 * height - 250 },
      { key: "contractors", label: "CONTRACTORS",  dataX: 0.36 * width,  screenY: 0.87 * height - 20 },
    ];

    const pillGroupMap: Record<string, d3.Selection<SVGGElement, unknown, null, undefined>> = {};

    OVERLAY_PILL_DEFS.forEach(({ key, label, dataX, screenY }) => {
      const pillW = label.length * 10 + 28;
      const pillH = 28;
      const pg = pillOverlay.append<SVGGElement>("g")
        .attr("transform", `translate(${dataX}, ${screenY})`);
      pg.append("rect")
        .attr("x", -pillW / 2).attr("y", -pillH / 2)
        .attr("width", pillW).attr("height", pillH)
        .attr("rx", 14).attr("ry", 14)
        .attr("fill", "#ffffff").attr("fill-opacity", 0.92)
        .attr("stroke", "#e2e8f0").attr("stroke-width", 1)
        .attr("filter", "url(#pill-shadow)");
      pg.append("text")
        .attr("x", 0).attr("y", 0)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "central")
        .attr("font-size", 13)
        .attr("font-family", "Poppins, sans-serif")
        .attr("font-weight", "600")
        .attr("letter-spacing", "0.12em")
        .attr("fill", "#475569")
        .text(label);
      pillGroupMap[key] = pg;
    });

    // ── Account name labels — zoom-aware progressive disclosure ─────────

    const labelsGroup = g.append("g").attr("class", "account-labels-layer").attr("pointer-events", "none");
    const labelFontSize = isFullscreen ? 13 : 10;
    const labelLimit = isFullscreen ? 22 : 14;
    const accountLabels = labelsGroup.selectAll<SVGTextElement, SimNode>("text")
      .data(accountSimNodes)
      .join("text")
      .attr("text-anchor", "middle")
      .attr("font-size", labelFontSize)
      .attr("font-family", "Poppins, sans-serif")
      .attr("font-weight", "500")
      .attr("letter-spacing", "0.01em")
      .attr("fill", "#475569")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 4)
      .attr("paint-order", "stroke")
      .text(d => d.name.length > labelLimit ? d.name.slice(0, labelLimit - 1) + "…" : d.name);

    // Assign real updateLabels — handles both visibility and counter-scale so labels stay
    // at constant screen size regardless of zoom level.
    updateLabels = (k: number) => {
      accountLabels
        .style("display", (d: SimNode) => {
          if (connectionCardAccountsRef.current.has(d.id)) return "none";
          if (k < 0.9) return "none";
          const sd = spotlightDataRef.current;
          const inSpotlight = sd ? sd.accounts.has(d.id) : false;
          if (k <= 1.4 && (d.contactCount ?? 0) < 3 && !inSpotlight) return "none";
          return null;
        })
        .attr("transform", (d: SimNode) =>
          `translate(${d.x ?? 0},${(d.y ?? 0) + nodeRadius(d.contactCount ?? 0) + 13}) scale(${1 / k})`
        );
    };
    updateLabels(1); // apply initial state at default zoom
    updateLabelsRef.current = updateLabels;

    // Connection cards layer — above account labels, below side panels
    g.append("g").attr("class", "connection-cards-layer");

    // Assign real updatePillPositions — tracks directors dynamically via zoomTransform
    updatePillPositions = (transform: d3.ZoomTransform) => {
      const dirAvgX = directorSimNodes.reduce((s, d) => s + (d.x ?? 60), 0) / directorSimNodes.length;
      pillGroupMap.directors.attr("transform",   `translate(${transform.applyX(dirAvgX)}, 200)`);
      pillGroupMap.agents.attr("transform",      `translate(${transform.applyX(0.36 * width)}, ${transform.applyY(0.10 * height) - 90})`);
      pillGroupMap.consultants.attr("transform", `translate(${transform.applyX(0.36 * width)}, ${transform.applyY(0.48 * height) - 270})`);
      pillGroupMap.clients.attr("transform",     `translate(${transform.applyX(0.82 * width)}, ${transform.applyY(0.50 * height) - 250})`);
      pillGroupMap.contractors.attr("transform", `translate(${transform.applyX(0.36 * width)}, ${transform.applyY(0.87 * height) - 20})`);
    };
    updatePillPositions(d3.zoomIdentity); // initial state

    // ── Forces ───────────────────────────────────────────────────────────

    const sim = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimEdge>(simEdges)
        .id(d => d.id)
        .distance(120)
        .strength(0.3),
      )
      .force("charge", d3.forceManyBody<SimNode>().strength(-800))
      .force("collide", d3.forceCollide<SimNode>().radius(d =>
        d.kind === "director" ? 94 : nodeRadius(d.contactCount ?? 0) + 4
      ).strength(1.4))
      .force("clusterX", d3.forceX<SimNode>(d => {
        if (d.kind === "director") return 60;
        return CLUSTERS[typeLane(d.accountType)].x;
      }).strength(d => {
        if (d.kind === "director") return 1.0;
        return typeLane(d.accountType) === "untyped" ? 0.7 : 0.9;
      }))
      .force("clusterY", d3.forceY<SimNode>(d => {
        if (d.kind === "director") return d.fy ?? height / 2;
        return CLUSTERS[typeLane(d.accountType)].y;
      }).strength(d => {
        if (d.kind === "director") return 0;
        const lane = typeLane(d.accountType);
        if (lane === "untyped") return 0.7;
        if (lane === "contractor") return 0.95;
        if (lane === "consultant" || lane === "client") return 0.85;
        return 0.9; // agent
      }))
      .on("tick", () => {
        // Circular cluster bounds — snap back along radial line if beyond maxRadius
        for (const d of simNodes) {
          if (d.kind === "director" || d.x == null || d.y == null) continue;
          const bound = CIRCLES[typeLane(d.accountType)];
          const dx = d.x - bound.cx, dy = d.y - bound.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > bound.maxRadius) {
            const angle = Math.atan2(dy, dx);
            d.x = bound.cx + Math.cos(angle) * bound.maxRadius;
            d.y = bound.cy + Math.sin(angle) * bound.maxRadius;
          }
        }
        simNodesRef.current = simNodes;
        links
          .attr("x1", d => (d.source as SimNode).x!)
          .attr("y1", d => (d.source as SimNode).y!)
          .attr("x2", d => (d.target as SimNode).x!)
          .attr("y2", d => (d.target as SimNode).y!);
        nodeGroups.attr("transform", d => `translate(${d.x},${d.y})`);
        updateLabels(svgRef.current ? d3.zoomTransform(svgRef.current).k : 1);
        updatePillPositions(d3.zoomTransform(svgRef.current!));
      });

    simRef.current = sim;

    const sanityTimer = setTimeout(() => {
      const lanes = (["agent", "consultant", "client", "contractor", "untyped"] as const);
      const counts: Record<string, number> = {};
      const inner: Record<string, number> = {}; // within 50% of maxRadius
      const outer80: Record<string, number> = {}; // beyond 80% of maxRadius

      for (const d of simNodes) {
        if (d.kind === "director" || d.x == null || d.y == null) continue;
        const lane = typeLane(d.accountType);
        counts[lane] = (counts[lane] ?? 0) + 1;
        const bound = CIRCLES[lane];
        const dx = d.x - bound.cx, dy = d.y - bound.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= bound.maxRadius * 0.5) inner[lane] = (inner[lane] ?? 0) + 1;
        if (dist >= bound.maxRadius * 0.8) outer80[lane] = (outer80[lane] ?? 0) + 1;
      }

      if (!counts["contractor"])
        console.warn("[CRM Neural Map] Contractor cluster has 0 nodes — accountType matching may be failing");

      for (const lane of lanes) {
        const n = counts[lane] ?? 0;
        if (!n) continue;
        const innerPct = Math.round(((inner[lane] ?? 0) / n) * 100);
        const outerPct = Math.round(((outer80[lane] ?? 0) / n) * 100);
        const msg = `[CRM Neural Map] ${lane} distribution: ${innerPct}% inner (≤50% r), ${outerPct}% outer (≥80% r)`;
        if (innerPct > 85) console.warn(msg + " — cluster too tight, consider weaker forces");
        else if (outerPct > 40) console.warn(msg + " — cluster pressing against circular bound, consider larger maxRadius");
        else console.log(msg);
      }
    }, 2000);

    return () => { sim.stop(); clearTimeout(sanityTimer); };
  }, [filteredNodes, filteredEdges, dimensions]);

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading network…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-full text-red-400 text-sm">
      Failed to load CRM data
    </div>
  );

  // ── JSX ────────────────────────────────────────────────────────────────────

  const spotlightChipText = (() => {
    if (!spotlightData) return null;
    if (selectedDirector) {
      const name = selectedDirector.charAt(0).toUpperCase() + selectedDirector.slice(1);
      return `${name}'s network — ${spotlightData.accounts.size} companies`;
    }
    return `${spotlightData.accounts.size} of ${filteredNodes.length} highlighted`;
  })();

  return (
    <div className={
      isFullscreen
        ? "fixed inset-0 z-50 bg-white flex flex-col overflow-hidden"
        : "relative w-full h-full bg-[#f9fafb] rounded-xl flex flex-col overflow-hidden"
    }>
      {/* Toolbar */}
      <div className="flex-shrink-0 z-10 px-3 pt-3 pb-2 flex flex-col gap-1.5">

        {/* Row 1 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Director filters */}
          {(["all", "dicky", "joe", "jesus"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                filter === f
                  ? "text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
              }`}
              style={filter === f ? { background: f === "all" ? "#1f2937" : DIRECTOR_COLORS[f] } : {}}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}

          <div className="w-px h-4 bg-gray-300" />

          {/* Add Account */}
          <button
            onClick={() => setShowAddAccount(true)}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-600 border border-gray-200 hover:border-red-400 hover:text-red-600 transition-all"
          >
            + Account
          </button>

          <div className="w-px h-4 bg-gray-300" />

          {/* View mode */}
          {(["all", "priority", "search"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setViewMode(m); if (m !== "search") setSearchText(""); }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                viewMode === m
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-400"
              }`}
            >
              {m === "all" ? "All" : m === "priority" ? "Priority" : "Search"}
            </button>
          ))}

          {/* Search input */}
          {viewMode === "search" && (
            <div className="flex items-center bg-white border border-gray-300 rounded-full px-3 py-1 gap-1.5">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                autoFocus
                type="text"
                placeholder="Search companies…"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="text-xs outline-none w-36 bg-transparent text-gray-700 placeholder:text-gray-400"
              />
              {searchText && (
                <button
                  onClick={() => { setSearchText(""); setViewMode("all"); }}
                  className="text-gray-400 hover:text-gray-700 text-sm leading-none"
                >×</button>
              )}
            </div>
          )}

          {/* Spotlight chip */}
          {spotlightData && spotlightChipText && (
            <div
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border"
              style={
                selectedDirector
                  ? {
                      background: `${DIRECTOR_COLORS[selectedDirector]}18`,
                      borderColor: `${DIRECTOR_COLORS[selectedDirector]}55`,
                      color: DIRECTOR_COLORS[selectedDirector],
                    }
                  : { background: "#eef2ff", borderColor: "#c7d2fe", color: "#4338ca" }
              }
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: selectedDirector ? DIRECTOR_COLORS[selectedDirector] : "#6366f1" }} />
              <span>{spotlightChipText}</span>
              <button
                onClick={() => { setSelectedDirector(null); setSelectedAccount(null); setSelectedContact(null); }}
                className="ml-1 text-sm leading-none opacity-60 hover:opacity-100"
              >×</button>
            </div>
          )}

          {/* Stats */}
          <div className="ml-auto flex flex-col items-end gap-0.5">
            <div className="text-xs text-gray-400 bg-white px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
              {filteredNodes.length} companies · {filteredEdges.length} connections
            </div>
            <span className="text-[11px] text-gray-400 leading-none" style={{ display: "none" }}>Recent + known sit higher</span>
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="p-1.5 rounded-lg bg-white border border-gray-200 hover:border-gray-400 text-gray-500 transition-all"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isFullscreen
                ? <path d="M9 9V4m0 0H4m5 0L3 10m18-6l-6 6m6-6v5m0-5h-5M9 20v-5m0 5H4m5 0l-6-6m18 6l-6-6m6 6v-5m0 5h-5" />
                : <path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              }
            </svg>
          </button>
        </div>

        {/* Row 2: slider */}
        {viewMode !== "search" && (
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-gray-200 w-fit">
            <span className="text-xs text-gray-500 whitespace-nowrap">Min contacts: {effectiveMin}</span>
            <input
              type="range" min={0} max={10} value={minContacts}
              onChange={e => setMinContacts(Number(e.target.value))}
              className="w-24 accent-red-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* SVG canvas — scrollable */}
      <div className="flex-1 overflow-y-auto relative">
        <svg ref={svgRef} width="100%" height="900" style={{ cursor: "grab", display: "block" }}>
          <g ref={gRef} />
        </svg>
      </div>

      {/* Account detail panel */}
      {selectedAccount && !selectedContact && (
        <div className="absolute top-20 right-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: getBubbleColor(selectedAccount.name) }}>
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.2)" }}
              >
                {selectedAccount.name.split(" ").map(w => w[0]).slice(0, 2).join("")}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{selectedAccount.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={selectedAccount.accountType || ""}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    disabled={isSavingType}
                    className="text-xs bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white rounded px-2 py-1 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer"
                    style={{ pointerEvents: "auto" }}
                  >
                    <option value="" disabled>— type —</option>
                    <option value="Client">Client</option>
                    <option value="Consultant">Consultant</option>
                    <option value="Agent">Agent</option>
                    <option value="Contractor">Contractor</option>
                  </select>
                  {typeSaveStatus === "saving" && <span className="text-xs text-white/70">Saving…</span>}
                  {typeSaveStatus === "saved" && <span className="text-xs text-green-300">✓ Saved</span>}
                  {typeSaveStatus === "error" && <span className="text-xs text-red-300">Failed — try again</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setSelectedAccount(null); setSelectedDirector(null); }}
              className="text-white/70 hover:text-white text-lg leading-none"
            >×</button>
          </div>

          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Directors</p>
            <div className="flex gap-1 flex-wrap">
              {selectedAccount.directors.length
                ? selectedAccount.directors.map(d => (
                  <span key={d} className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: DIRECTOR_COLORS[d] ?? "#6b7280" }}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </span>
                ))
                : <span className="text-xs text-gray-400">None assigned</span>
              }
            </div>
          </div>

          {/* Logo replace */}
          <div className="border-b border-gray-100">
            {!showLogoReplace ? (
              <button
                onClick={() => setShowLogoReplace(true)}
                className="w-full text-left px-4 py-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors"
              >
                <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                Replace logo
              </button>
            ) : (
              <div className="px-4 py-3 space-y-2">
                <div className="flex gap-1">
                  {(["upload", "url"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => { setLogoReplaceMode(m); setLogoSaveError(""); }}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                        logoReplaceMode === m
                          ? "bg-gray-800 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {m === "upload" ? "Upload file" : "Paste URL"}
                    </button>
                  ))}
                </div>

                {logoReplaceMode === "upload" ? (
                  <div className="space-y-1.5">
                    <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-3 py-3 cursor-pointer hover:border-gray-400 transition-colors">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                      <span className="text-xs text-gray-400">{logoUploadFile ? logoUploadFile.name : "Choose image (PNG, JPG, SVG, WebP · 2MB max)"}</span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.svg,.webp"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setLogoUploadFile(f);
                          const reader = new FileReader();
                          reader.onload = ev => setLogoUploadPreview(ev.target?.result as string);
                          reader.readAsDataURL(f);
                        }}
                      />
                    </label>
                    {logoUploadPreview && (
                      <img src={logoUploadPreview} alt="preview" className="h-10 w-10 object-contain rounded border border-gray-100 mx-auto" />
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      value={logoUrlInput}
                      onChange={e => { setLogoUrlInput(e.target.value); setLogoUrlPreviewOk(false); }}
                      placeholder="https://example.com/logo.png"
                      className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                    />
                    {logoUrlInput && (
                      <img
                        src={logoUrlInput}
                        alt="preview"
                        className="h-10 w-10 object-contain rounded border border-gray-100 mx-auto"
                        onLoad={() => setLogoUrlPreviewOk(true)}
                        onError={() => setLogoUrlPreviewOk(false)}
                      />
                    )}
                    {logoUrlInput && !logoUrlPreviewOk && (
                      <p className="text-xs text-amber-500 text-center">Image not loading — check URL</p>
                    )}
                  </div>
                )}

                {logoSaveError && <p className="text-xs text-red-500">{logoSaveError}</p>}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleLogoSave}
                    disabled={logoSaving || (logoReplaceMode === "upload" ? !logoUploadFile : !logoUrlInput.trim())}
                    className="flex-1 py-1.5 rounded bg-gray-800 text-white text-xs font-semibold disabled:opacity-40 hover:bg-gray-700 transition-colors"
                  >
                    {logoSaving ? "Saving…" : "Save logo"}
                  </button>
                  <button
                    onClick={() => { setShowLogoReplace(false); setLogoSaveError(""); }}
                    className="px-3 py-1.5 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto">
            <p className="text-xs text-gray-500 px-4 pt-3 pb-1 font-medium">
              {selectedAccount.contactCount} Contact{selectedAccount.contactCount !== 1 ? "s" : ""}
            </p>
            {selectedAccount.contacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => handleContactClick(contact)}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <p className="text-sm font-medium text-gray-800">{contact.name}</p>
                <p className="text-xs text-gray-400">{contact.position || contact.contactType || "—"}</p>
              </button>
            ))}
          </div>

          {/* Add Contact */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full text-left px-4 py-2.5 border-t border-gray-100 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1.5 transition-colors"
            >
              <span className="text-base leading-none font-light">+</span>
              Add contact at {selectedAccount.name}
            </button>
          ) : (
            <div className="border-t border-gray-100 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-gray-700">New Contact</p>

              <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Full name *" autoFocus
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400" />
              <input value={formPosition} onChange={e => setFormPosition(e.target.value)} placeholder="Position"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400" />
              <input value={formEmail} onChange={e => setFormEmail(e.target.value)} type="email" placeholder="Email"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400" />
              <input value={formPhone} onChange={e => setFormPhone(e.target.value)} type="tel" placeholder="Phone"
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400" />

              <div className="relative">
                {selectedConnection ? (
                  <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                    <span className="text-blue-700 text-xs flex-1">{selectedConnection.name}</span>
                    <button onClick={() => { setSelectedConnection(null); setConnectionSearchQuery(""); }} className="text-blue-400 hover:text-blue-700 text-sm leading-none">×</button>
                  </div>
                ) : (
                  <input
                    value={connectionSearchQuery}
                    onChange={e => setConnectionSearchQuery(e.target.value)}
                    onFocus={() => connectionSearchResults.length > 0 && setShowConnectionDropdown(true)}
                    onBlur={() => setTimeout(() => setShowConnectionDropdown(false), 150)}
                    placeholder="Connected to (search contacts)…"
                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400"
                  />
                )}
                {showConnectionDropdown && connectionSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-28 overflow-y-auto">
                    {connectionSearchResults.map(r => (
                      <button
                        key={r.id}
                        onMouseDown={() => {
                          setSelectedConnection({ id: r.id, name: r.name });
                          setConnectionSearchQuery("");
                          setShowConnectionDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 text-xs border-b border-gray-50 last:border-0"
                      >
                        <span className="font-medium text-gray-800">{r.name}</span>
                        {r.company && <span className="text-gray-400 ml-1">· {r.company}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <textarea value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Initial note…" rows={2}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 resize-none" />

              <div>
                <p className="text-xs text-gray-400 mb-1">Assign to director</p>
                <div className="flex gap-1 flex-wrap">
                  {(["", "dicky", "joe", "jesus"] as const).map(d => (
                    <button
                      key={d || "none"}
                      onClick={() => setFormDirector(d)}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-all border ${
                        formDirector === d
                          ? d === "" ? "bg-gray-200 text-gray-700 border-gray-300" : "border-transparent text-white"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                      }`}
                      style={formDirector === d && d ? { background: DIRECTOR_COLORS[d], borderColor: DIRECTOR_COLORS[d] } : {}}
                    >
                      {d === "" ? "None" : d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formAlsoCreateLead} onChange={e => setFormAlsoCreateLead(e.target.checked)} className="accent-red-500" />
                <span className="text-xs text-gray-600">Also create a lead</span>
              </label>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAddContact}
                  disabled={!formName.trim() || isSavingContact}
                  className="flex-1 py-1.5 rounded bg-red-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
                >
                  {isSavingContact ? "Saving…" : "Save Contact"}
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
              {contactSaveStatus === "saved" && <p className="text-xs text-green-600">✓ Contact created in Monday</p>}
              {contactSaveStatus === "error" && <p className="text-xs text-red-500">Failed to create contact</p>}
            </div>
          )}

          <div className="border-t border-red-100">
            <button
              onClick={() => setShowDeleteAccountModal(true)}
              className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              Delete account
            </button>
          </div>
        </div>
      )}

      {/* Director detail panel */}
      {selectedDirector && directorStats && (
        <div className="absolute top-20 right-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
          <div className="px-4 py-4 flex items-center justify-between" style={{ background: directorStats.dirConfig?.color ?? "#6b7280" }}>
            <div className="flex items-center gap-3">
              {directorStats.dirConfig?.photo && (
                <img
                  src={directorStats.dirConfig.photo}
                  alt={directorStats.dirConfig.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/40"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div>
                <p className="text-white font-bold text-base">{directorStats.dirConfig?.name}</p>
                <p className="text-white/80 text-xs">Director</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDirector(null)}
              className="text-white/70 hover:text-white text-lg leading-none"
            >×</button>
          </div>

          <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-bold text-gray-800">{directorStats.totalContacts}</p>
              <p className="text-xs text-gray-400">Contacts</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-xl font-bold text-gray-800">{directorStats.totalAccounts}</p>
              <p className="text-xs text-gray-400">Companies</p>
            </div>
          </div>

          {directorStats.topAccounts.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-gray-500 font-medium mb-2">Top accounts</p>
              <div className="space-y-1.5">
                {directorStats.topAccounts.map(({ account, count }) => (
                  <div key={account.id} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 truncate flex-1">{account.name}</span>
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white ml-2 flex-shrink-0"
                      style={{ background: directorStats.dirConfig?.color ?? "#6b7280" }}
                    >
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact detail panel */}
      {selectedContact && (
        <div className="absolute bottom-3 right-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
          <div className="bg-gray-800 px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <button onClick={handleContactBack} className="text-gray-300 hover:text-white text-xs flex items-center gap-1">
                ← back
              </button>
              <button onClick={() => setSelectedContact(null)} className="text-gray-300 hover:text-white text-lg leading-none">×</button>
            </div>
            <p className="text-white font-semibold text-sm">{selectedContact.name}</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-gray-400 text-xs">{selectedContact.position || selectedContact.contactType}</p>
              {(() => {
                const accId = lookupMaps.contactToAccountId.get(selectedContact.id);
                const acc = accId ? data?.nodes.find(n => n.id === accId) : null;
                return acc ? <span className="text-gray-500 text-xs truncate">{acc.name}</span> : null;
              })()}
            </div>
            <button
              onClick={() => setMoveOpen(v => !v)}
              className="mt-2 text-gray-400 hover:text-white text-xs transition-colors"
            >
              {moveOpen ? "▲ Cancel move" : "Move to… →"}
            </button>
          </div>

          {/* Move-to section */}
          {moveOpen && (
            <div className="border-b border-gray-100 px-4 py-3 space-y-2 bg-gray-50">
              <p className="text-xs font-medium text-gray-600">Move to account</p>
              <input
                value={moveQuery}
                onChange={e => { setMoveQuery(e.target.value); setMovePending(null); }}
                placeholder="Search accounts…"
                autoFocus
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 bg-white"
              />
              {moveQuery.trim() && !movePending && (
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {(data?.nodes ?? [])
                    .filter(n =>
                      n.name.toLowerCase().includes(moveQuery.toLowerCase()) &&
                      n.id !== lookupMaps.contactToAccountId.get(selectedContact.id)
                    )
                    .slice(0, 6)
                    .map(n => (
                      <button
                        key={n.id}
                        onClick={() => setMovePending({ id: n.id, name: n.name })}
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-white border border-gray-100 bg-white text-gray-700"
                      >
                        {n.name}
                      </button>
                    ))
                  }
                </div>
              )}
              {movePending && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-600">Move <strong>{selectedContact.name}</strong> to <strong>{movePending.name}</strong>?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleMoveContact}
                      disabled={moveStatus === "moving"}
                      className="flex-1 py-1 rounded bg-indigo-600 text-white text-xs font-medium disabled:opacity-50 hover:bg-indigo-700"
                    >
                      {moveStatus === "moving" ? "Moving…" : "Confirm"}
                    </button>
                    <button
                      onClick={() => setMovePending(null)}
                      className="flex-1 py-1 rounded bg-gray-100 text-gray-600 text-xs hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                  {moveStatus === "moved" && <p className="text-xs text-green-600">✓ Moved!</p>}
                  {moveStatus === "error" && <p className="text-xs text-red-500">{moveError}</p>}
                </div>
              )}
            </div>
          )}

          {spotlightData && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border-b border-indigo-100">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
              <span className="text-xs text-indigo-700 font-medium">Spotlighting their network</span>
            </div>
          )}

          <div className="max-h-96 overflow-y-auto">
            <div className="px-4 py-3 space-y-2 text-sm">
              {selectedContact.email && (
                <div><span className="text-gray-400 text-xs">Email</span><p className="text-gray-800 text-xs">{selectedContact.email}</p></div>
              )}
              {selectedContact.phone && (
                <div><span className="text-gray-400 text-xs">Phone</span><p className="text-gray-800 text-xs">{selectedContact.phone}</p></div>
              )}
              {selectedContact.lastContacted && (
                <div><span className="text-gray-400 text-xs">Last contacted</span><p className="text-gray-800 text-xs">{selectedContact.lastContacted}</p></div>
              )}
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-gray-400 text-xs">Connections ({(selectedContact.connectedToIds ?? []).length})</span>
                  <button
                    onClick={() => setConnAddOpen(v => !v)}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
                  >
                    {connAddOpen ? "▲" : "+ Add"}
                  </button>
                </div>
                <div className="space-y-1 mt-0.5">
                  {(selectedContact.connectedToIds ?? []).map(cid => {
                    const conn = lookupMaps.contactById.get(cid);
                    const accId = lookupMaps.contactToAccountId.get(cid);
                    const acc = accId ? data?.nodes.find(n => n.id === accId) : null;
                    return (
                      <div key={cid} className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-700 flex-1 truncate">
                          {conn?.name ?? cid}
                          {acc && <span className="text-gray-400"> · {acc.name}</span>}
                        </span>
                        <button
                          onClick={() => handleRemoveConnection(cid)}
                          className="text-gray-300 hover:text-red-500 text-sm leading-none flex-shrink-0 transition-colors"
                          title="Remove connection"
                        >×</button>
                      </div>
                    );
                  })}
                </div>
                {connAddOpen && (
                  <div className="relative mt-1.5">
                    <input
                      value={connSearchQuery}
                      onChange={e => setConnSearchQuery(e.target.value)}
                      onFocus={() => connSearchResults.length > 0 && setConnSearchOpen(true)}
                      onBlur={() => setTimeout(() => setConnSearchOpen(false), 150)}
                      placeholder="Search contacts to link…"
                      autoFocus
                      className="w-full text-xs border border-indigo-200 rounded px-2 py-1.5 outline-none focus:border-indigo-400"
                    />
                    {connSearchOpen && connSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded shadow-lg z-50 max-h-28 overflow-y-auto">
                        {connSearchResults.map(r => (
                          <button
                            key={r.id}
                            onMouseDown={() => {
                              handleAddConnection(r.id);
                              setConnSearchQuery("");
                              setConnSearchOpen(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 text-xs border-b border-gray-50 last:border-0"
                          >
                            <span className="font-medium text-gray-800">{r.name}</span>
                            {r.company && <span className="text-gray-400 ml-1">· {r.company}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedContact.notes && (
                <div>
                  <span className="text-gray-400 text-xs">Notes</span>
                  <p className="text-gray-600 text-xs line-clamp-3 mt-0.5">{selectedContact.notes}</p>
                </div>
              )}
            </div>

            <div className="px-4 pb-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-600 mb-1.5">Add Note</p>
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Type a note…"
                rows={2}
                className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-blue-400 resize-none mb-1.5"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || noteStatus === "saving"}
                  className="flex-1 py-1 rounded bg-gray-700 text-white text-xs disabled:opacity-50 hover:bg-gray-800 transition-colors"
                >
                  {noteStatus === "saving" ? "Saving…" : "Save Note"}
                </button>
                {noteStatus === "saved" && <span className="text-green-600 text-xs">✓ Saved</span>}
                {noteStatus === "error" && <span className="text-red-500 text-xs">Error</span>}
              </div>
            </div>

            <div className="px-4 pb-4 border-t border-gray-100 pt-3">
              {leadStatus === "idle" && !isLeadConfirmOpen && (
                <button
                  onClick={() => setIsLeadConfirmOpen(true)}
                  disabled={selectedContact.id.startsWith("syn-")}
                  className="w-full py-1.5 rounded border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Convert to Lead →
                </button>
              )}
              {isLeadConfirmOpen && (
                <div className="text-xs space-y-2">
                  <p className="text-gray-600">Create a lead for <strong>{selectedContact.name}</strong>?</p>
                  <div className="flex gap-2">
                    <button onClick={handleConvertToLead} className="flex-1 py-1 rounded bg-red-600 text-white text-xs font-medium">Confirm</button>
                    <button onClick={() => setIsLeadConfirmOpen(false)} className="flex-1 py-1 rounded bg-gray-100 text-gray-600 text-xs">Cancel</button>
                  </div>
                </div>
              )}
              {leadStatus === "converting" && <p className="text-xs text-gray-500 text-center">Creating lead…</p>}
              {leadStatus === "success" && (
                <div className="text-xs text-green-600 space-y-1">
                  <p>✓ Lead created!</p>
                  {leadUrl && <a href={leadUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline block">View in Monday →</a>}
                </div>
              )}
              {leadStatus === "error" && <p className="text-xs text-red-500">{leadError || "Failed to create lead"}</p>}
            </div>
          </div>

          <div className="border-t border-red-100">
            <button
              onClick={() => setShowDeleteContactModal(true)}
              className="w-full text-left px-4 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              Delete contact
            </button>
          </div>
        </div>
      )}

      {/* Add Account modal */}
      {showAddAccount && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] z-30 flex items-center justify-center" onClick={() => setShowAddAccount(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="font-semibold text-gray-800 text-sm">New Account</p>
              <button onClick={() => setShowAddAccount(false)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Account name <span className="text-red-500">*</span></label>
                <input
                  autoFocus
                  value={addAccName}
                  onChange={e => setAddAccName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddAccount()}
                  placeholder="e.g. Acme Consulting"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Type</label>
                <select
                  value={addAccType}
                  onChange={e => setAddAccType(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 bg-white cursor-pointer"
                >
                  <option value="">No type</option>
                  <option value="Client">Client</option>
                  <option value="Consultant">Consultant</option>
                  <option value="Agent">Agent</option>
                  <option value="Contractor">Contractor</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Domain</label>
                <input
                  value={addAccDomain}
                  onChange={e => setAddAccDomain(e.target.value)}
                  placeholder="e.g. example.com — used for auto-logo lookup"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400"
                />
              </div>
              {addAccError && <p className="text-xs text-red-500">{addAccError}</p>}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={handleAddAccount}
                disabled={!addAccName.trim() || addAccSaving}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {addAccSaving && (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {addAccSaving ? "Creating…" : "Create account"}
              </button>
              <button
                onClick={() => { setShowAddAccount(false); setAddAccError(""); }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete account modal */}
      {showDeleteAccountModal && selectedAccount && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => { setShowDeleteAccountModal(false); setDeleteAccountError(""); }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[420px] max-w-[calc(100%-32px)]"
            style={{ boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Delete {selectedAccount.name}?</h3>
            <p className="text-sm text-slate-500 mb-4">
              {selectedAccount.contactCount === 0
                ? "This account has no contacts. It will be archived on Monday and removed from the map."
                : `This account has ${selectedAccount.contactCount} contact${selectedAccount.contactCount !== 1 ? "s" : ""}. Archiving the account will remove it from the map. Their contact records will remain but will no longer be linked to a company.`
              }
            </p>
            {selectedAccount.contactCount > 0 && (
              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAccountArchiveContacts}
                  onChange={e => setDeleteAccountArchiveContacts(e.target.checked)}
                  className="accent-red-500"
                />
                <span className="text-xs text-slate-500">Also archive all contacts at this account</span>
              </label>
            )}
            {deleteAccountError && <p className="text-xs text-red-500 mb-3">{deleteAccountError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDeleteAccountModal(false); setDeleteAccountError(""); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {deletingAccount && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deletingAccount ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete contact modal */}
      {showDeleteContactModal && selectedContact && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center"
          style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
          onClick={() => { setShowDeleteContactModal(false); setDeleteContactError(""); }}
        >
          <div
            className="bg-white rounded-2xl p-6 w-[420px] max-w-[calc(100%-32px)]"
            style={{ boxShadow: "0 20px 48px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Delete {selectedContact.name}?</h3>
            <p className="text-sm text-slate-500 mb-4">
              {(() => {
                const connCount = selectedContact.connectedToIds?.length ?? 0;
                const accId = lookupMaps.contactToAccountId.get(selectedContact.id);
                const accName = accId ? data?.nodes.find(n => n.id === accId)?.name : null;
                if (connCount === 0)
                  return `This contact will be archived on Monday and removed from ${accName ?? "their account"}.`;
                return `This contact will be archived on Monday. They will also be removed from ${connCount} other contact${connCount !== 1 ? "s'" : "'s"} connection list${connCount !== 1 ? "s" : ""}.`;
              })()}
            </p>
            {deleteContactError && <p className="text-xs text-red-500 mb-3">{deleteContactError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDeleteContactModal(false); setDeleteContactError(""); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-slate-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteContact}
                disabled={deletingContact}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {deletingContact && <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {deletingContact ? "Deleting…" : "Delete contact"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#2563eb" }} />
            Clients
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#8b5cf6" }} />
            Consultants
          </span>
        </div>
        <span className="text-xs text-gray-400">Scroll to zoom · Drag to pan · Click bubble to spotlight · Esc to clear</span>
      </div>
    </div>
  );
}
