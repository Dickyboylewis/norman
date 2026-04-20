"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  contactType: string;
  directors: string[];
  company: string;
  companyDomain: string;
  position: string;
  email: string;
  phone: string;
  linkedIn: string;
  lastContacted: string;
  firstMet: string;
  followUpDate: string;
  notes: string;
  sector: string;
  location: string;
  priority: string;
  connectedToIds: string[];
  referredByIds: string[];
  accountIds: string[];
}

interface Account {
  id: string;
  name: string;
  domain: string;
  type: string;
  owner: string;
  priority: string;
}

interface CRMData {
  contacts: Contact[];
  accounts: Account[];
  connections: Array<{ from: string; to: string }>;
  stats: {
    totalContacts: number;
    totalAccounts: number;
    totalConnections: number;
    contactsWithEmail: number;
    contactsWithLastContacted: number;
    contactsWithConnections: number;
  };
}

interface CompanyNode {
  id: string;
  name: string;
  domain: string;
  directors: Set<string>;
  contacts: Contact[];
  contactCount: number;
  type: "client" | "agent" | "consultant";
  priority: "High" | "Medium" | "Low" | null;
  lastContactedDate: Date | null;
  daysSinceContact: number | null;
  importanceScore: number;
  radius: number;
}

interface DirectorNode {
  id: string;
  name: string;
  color: string;
  photo: string;
}

interface NodePosition {
  x: number;
  y: number;
}

interface CRMNeuralMapProps {
  compact?: boolean;
}

// ── Director Definitions ─────────────────────────────────────────────────────

const DIRECTORS: DirectorNode[] = [
  { id: "dicky", name: "Dicky", color: "#EAB308", photo: "/dicky.png" },
  { id: "joe", name: "Joe", color: "#DC2626", photo: "/joe.png" },
  { id: "jesus", name: "Jesus", color: "#2563EB", photo: "/jesus.png" },
];

// ── Helper Functions ─────────────────────────────────────────────────────────

function getDirectorFromEmail(email: string): string | null {
  if (!email) return null;
  const lower = email.toLowerCase();
  if (lower === "dicky@white-red.co.uk" || lower.includes("dicky")) return "dicky";
  if (lower === "joe@white-red.co.uk" || lower.includes("joe")) return "joe";
  if (lower === "jesus@white-red.co.uk" || lower.includes("jesus")) return "jesus";
  return null;
}

function groupContactsIntoCompanies(contacts: Contact[], accounts: Account[]): CompanyNode[] {
  const companyMap = new Map<string, Contact[]>();

  // Group contacts by company name (trimmed lowercase)
  contacts.forEach((contact) => {
    if (!contact.company) return;
    const key = contact.company.toLowerCase().trim();
    if (!companyMap.has(key)) {
      companyMap.set(key, []);
    }
    companyMap.get(key)!.push(contact);
  });

  const companies: CompanyNode[] = [];
  const now = new Date();

  companyMap.forEach((contactList, companyKey) => {
    const firstContact = contactList[0];
    const companyName = firstContact.company;

    // Get domain
    let domain = contactList.find((c) => c.companyDomain)?.companyDomain || "";
    if (!domain) {
      const matchingAccount = accounts.find((a) => a.name.toLowerCase().trim() === companyKey);
      if (matchingAccount) domain = matchingAccount.domain;
    }

    // Get unique directors
    const directorSet = new Set<string>();
    contactList.forEach((c) => c.directors.forEach((d) => directorSet.add(d)));

    // Determine type based on majority contactType
    const typeCounts = { client: 0, agent: 0, consultant: 0 };
    contactList.forEach((c) => {
      const ct = c.contactType.toLowerCase();
      if (ct.includes("agent") || ct.includes("leasing") || ct.includes("capital markets")) {
        typeCounts.agent++;
      } else if (
        ct.includes("client") ||
        ct.includes("dm") ||
        ct.includes("development manager") ||
        ct.includes("owner") ||
        ct.includes("ceo") ||
        ct.includes("am") ||
        ct.includes("asset manager")
      ) {
        typeCounts.client++;
      } else {
        typeCounts.consultant++;
      }
    });
    let type: "client" | "agent" | "consultant" = "consultant";
    if (typeCounts.client > typeCounts.agent && typeCounts.client > typeCounts.consultant) {
      type = "client";
    } else if (typeCounts.agent > typeCounts.consultant) {
      type = "agent";
    }

    // Get highest priority
    const priorities = contactList.map((c) => c.priority).filter(Boolean);
    let priority: "High" | "Medium" | "Low" | null = null;
    if (priorities.includes("High")) priority = "High";
    else if (priorities.includes("Medium")) priority = "Medium";
    else if (priorities.includes("Low")) priority = "Low";

    // Get most recent lastContacted
    const lastContactedDates = contactList
      .map((c) => c.lastContacted)
      .filter(Boolean)
      .map((d) => new Date(d));
    const lastContactedDate = lastContactedDates.length > 0 ? new Date(Math.max(...lastContactedDates.map((d) => d.getTime()))) : null;

    const daysSinceContact = lastContactedDate
      ? Math.floor((now.getTime() - lastContactedDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Calculate importance score
    const priorityComponent = priority === "High" ? 3 : priority === "Medium" ? 2 : priority === "Low" ? 1 : 0.5;
    const recencyComponent =
      daysSinceContact !== null
        ? daysSinceContact <= 30
          ? 3
          : daysSinceContact <= 90
          ? 2
          : daysSinceContact <= 180
          ? 1
          : 0.3
        : 0.3;
    const contactCountComponent = (Math.min(contactList.length, 5) / 5) * 2;
    const importanceScore = priorityComponent + recencyComponent + contactCountComponent;

    companies.push({
      id: companyKey,
      name: companyName,
      domain,
      directors: directorSet,
      contacts: contactList,
      contactCount: contactList.length,
      type,
      priority,
      lastContactedDate,
      daysSinceContact,
      importanceScore,
      radius: 0, // Will be normalized later
    });
  });

  // Normalize radius between 22px and 52px
  if (companies.length > 0) {
    const scores = companies.map((c) => c.importanceScore);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore || 1;

    companies.forEach((c) => {
      c.radius = 22 + ((c.importanceScore - minScore) / range) * 30;
    });
  }

  return companies;
}

function getTypeColor(type: "client" | "agent" | "consultant"): { bg: string; border: string; primary: string } {
  switch (type) {
    case "client":
      return { bg: "#EFF6FF", border: "#3B82F6", primary: "#3B82F6" };
    case "agent":
      return { bg: "#FFFBEB", border: "#F59E0B", primary: "#F59E0B" };
    case "consultant":
      return { bg: "#F1F5F9", border: "#94A3B8", primary: "#64748B" };
  }
}

function getRecencyRing(daysSinceContact: number | null): string | null {
  if (daysSinceContact === null) return null;
  if (daysSinceContact <= 30) return "#22C55E";
  if (daysSinceContact <= 90) return "#86EFAC";
  if (daysSinceContact <= 180) return "#FACC15";
  if (daysSinceContact <= 365) return "#F97316";
  return null;
}

function getRecencyBand(daysSinceContact: number | null): number {
  if (daysSinceContact === null) return 5;
  if (daysSinceContact <= 30) return 1;
  if (daysSinceContact <= 90) return 2;
  if (daysSinceContact <= 180) return 3;
  if (daysSinceContact <= 365) return 4;
  return 5;
}

function getRecencyLabel(daysSinceContact: number | null): { label: string; color: string } {
  if (daysSinceContact === null) return { label: "Never logged", color: "#9CA3AF" };
  if (daysSinceContact <= 30) return { label: "Hot", color: "#22C55E" };
  if (daysSinceContact <= 90) return { label: "Warm", color: "#86EFAC" };
  if (daysSinceContact <= 180) return { label: "Cooling", color: "#FACC15" };
  if (daysSinceContact <= 365) return { label: "Cold", color: "#EF4444" };
  return { label: "Dormant", color: "#A855F7" };
}

function calculateRadialLayout(
  companies: CompanyNode[],
  centerX: number,
  centerY: number,
  directorCount: number,
  compact: boolean
): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();

  // Ring radii - scaled for compact mode
  const ringRadii = compact ? [75, 120, 160, 200, 235] : [180, 310, 440, 570, 700];

  // Group companies by recency band
  const bandGroups: CompanyNode[][] = [[], [], [], [], []];
  companies.forEach((company) => {
    const band = getRecencyBand(company.daysSinceContact);
    bandGroups[band - 1].push(company);
  });

  // Place companies in each ring
  bandGroups.forEach((group, bandIndex) => {
    if (group.length === 0) return;

    const radius = ringRadii[bandIndex];

    // Sort by type for angular zones
    const clients = group.filter((c) => c.type === "client");
    const agents = group.filter((c) => c.type === "agent");
    const consultants = group.filter((c) => c.type === "consultant");

    const allSorted = [...clients, ...agents, ...consultants];

    // Distribute evenly around the ring
    const angleStep = (2 * Math.PI) / allSorted.length;
    let startAngle = 0;

    allSorted.forEach((company, i) => {
      const angle = startAngle + i * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.set(company.id, { x, y });
    });
  });

  // Simple collision avoidance (20 iterations max)
  for (let iter = 0; iter < 20; iter++) {
    let hadCollision = false;
    const posArray = Array.from(positions.entries());

    for (let i = 0; i < posArray.length; i++) {
      for (let j = i + 1; j < posArray.length; j++) {
        const [id1, pos1] = posArray[i];
        const [id2, pos2] = posArray[j];

        const company1 = companies.find((c) => c.id === id1)!;
        const company2 = companies.find((c) => c.id === id2)!;

        const minDist = company1.radius + company2.radius + 10;
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist && dist > 0) {
          hadCollision = true;
          // Push smaller node outward slightly
          if (company1.importanceScore < company2.importanceScore) {
            const angle = Math.atan2(pos1.y - centerY, pos1.x - centerX);
            positions.set(id1, {
              x: pos1.x + Math.cos(angle) * 5,
              y: pos1.y + Math.sin(angle) * 5,
            });
          } else {
            const angle = Math.atan2(pos2.y - centerY, pos2.x - centerX);
            positions.set(id2, {
              x: pos2.x + Math.cos(angle) * 5,
              y: pos2.y + Math.sin(angle) * 5,
            });
          }
        }
      }
    }

    if (!hadCollision) break;
  }

  return positions;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CRMNeuralMap({ compact = false }: CRMNeuralMapProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "6mo" | "All">("90d");
  const [directorFilters, setDirectorFilters] = useState<Record<string, boolean>>({
    dicky: true,
    joe: true,
    jesus: true,
  });
  const [typeFilters, setTypeFilters] = useState({
    clients: true,
    agents: true,
    consultants: true,
  });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyNode | null>(null);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);
  const [showRelationships, setShowRelationships] = useState(false);

  // Pan and zoom state
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Fetch CRM data
  const { data, isLoading, error, refetch } = useQuery<CRMData>({
    queryKey: ["crm-data"],
    queryFn: async () => {
      const res = await fetch("/api/crm");
      if (!res.ok) throw new Error("Failed to fetch CRM data");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  // Detect logged-in director
  const loggedInDirector = useMemo(() => getDirectorFromEmail(session?.user?.email || ""), [session]);

  // Group contacts into company nodes
  const companyNodes = useMemo(() => {
    if (!data) return [];
    return groupContactsIntoCompanies(data.contacts, data.accounts);
  }, [data]);

  // Apply filters
  const filteredCompanies = useMemo(() => {
    let filtered = companyNodes;

    // Director filter
    if (loggedInDirector && compact) {
      filtered = filtered.filter((c) => c.directors.has(loggedInDirector));
    } else {
      filtered = filtered.filter((c) => {
        return Array.from(c.directors).some((d) => directorFilters[d]);
      });
    }

    // Type filter
    filtered = filtered.filter((c) => {
      if (c.type === "client" && !typeFilters.clients) return false;
      if (c.type === "agent" && !typeFilters.agents) return false;
      if (c.type === "consultant" && !typeFilters.consultants) return false;
      return true;
    });

    // Timeframe filter
    if (timeframe !== "All") {
      const now = new Date();
      const cutoffDays = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : timeframe === "90d" ? 90 : 180;
      filtered = filtered.filter((c) => {
        if (!c.lastContactedDate) return false;
        const daysSince = Math.floor((now.getTime() - c.lastContactedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysSince <= cutoffDays;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.contacts.some((contact) => contact.name.toLowerCase().includes(query) || contact.email.toLowerCase().includes(query))
      );
    }

    // Compact mode: top 20 most important
    if (compact) {
      filtered = filtered.sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 20);
    }

    return filtered;
  }, [companyNodes, loggedInDirector, compact, directorFilters, typeFilters, timeframe, searchQuery]);

  // Calculate stats for compact mode
  const stats = useMemo(() => {
    const active = companyNodes.filter((c) => c.daysSinceContact !== null && c.daysSinceContact <= 90).length;
    const cooling = companyNodes.filter((c) => c.daysSinceContact !== null && c.daysSinceContact > 90 && c.daysSinceContact <= 180).length;
    const atRisk = companyNodes.filter(
      (c) =>
        c.daysSinceContact !== null &&
        c.daysSinceContact > 180 &&
        c.daysSinceContact <= 365 &&
        (c.priority === "High" || c.priority === "Medium")
    ).length;
    return { active, cooling, atRisk };
  }, [companyNodes]);

  // Apply URL filter preset
  useEffect(() => {
    const filter = searchParams?.get("filter");
    if (filter === "active") {
      setTimeframe("90d");
    } else if (filter === "cooling") {
      setTimeframe("6mo");
    } else if (filter === "atrisk") {
      setTimeframe("All");
    }
  }, [searchParams]);

  // Calculate layout positions
  const { directorPositions, companyPositions, canvasWidth, canvasHeight } = useMemo(() => {
    const width = compact ? 600 : 1600;
    const height = compact ? 400 : 1200;
    const centerX = width / 2;
    const centerY = height / 2;

    const directorPositions = new Map<string, NodePosition>();

    // Place active directors at center
    const activeDirectors = DIRECTORS.filter((d) => loggedInDirector === d.id || (!compact && directorFilters[d.id]));

    if (activeDirectors.length === 1) {
      directorPositions.set(activeDirectors[0].id, { x: centerX, y: centerY });
    } else if (activeDirectors.length === 2) {
      directorPositions.set(activeDirectors[0].id, { x: centerX - 30, y: centerY });
      directorPositions.set(activeDirectors[1].id, { x: centerX + 30, y: centerY });
    } else if (activeDirectors.length === 3) {
      directorPositions.set(activeDirectors[0].id, { x: centerX, y: centerY - 35 });
      directorPositions.set(activeDirectors[1].id, { x: centerX - 30, y: centerY + 20 });
      directorPositions.set(activeDirectors[2].id, { x: centerX + 30, y: centerY + 20 });
    }

    const companyPositions = calculateRadialLayout(filteredCompanies, centerX, centerY, activeDirectors.length, compact);

    return { directorPositions, companyPositions, canvasWidth: width, canvasHeight: height };
  }, [filteredCompanies, loggedInDirector, compact, directorFilters]);

  // Build connections
  const connections = useMemo(() => {
    const conns: Array<{
      from: string;
      to: string;
      path: string;
      color: string;
      width: number;
    }> = [];

    filteredCompanies.forEach((company) => {
      const toPos = companyPositions.get(company.id);
      if (!toPos) return;

      company.directors.forEach((directorId) => {
        const fromPos = directorPositions.get(directorId);
        if (!fromPos) return;

        // Quadratic bezier with perpendicular offset
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const dx = toPos.x - fromPos.x;
        const dy = toPos.y - fromPos.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const perpX = (-dy / len) * 30;
        const perpY = (dx / len) * 30;
        const cpX = midX + perpX;
        const cpY = midY + perpY;

        const path = `M ${fromPos.x} ${fromPos.y} Q ${cpX} ${cpY} ${toPos.x} ${toPos.y}`;

        const typeColor = getTypeColor(company.type);
        const color = typeColor.primary;

        const contactsForDirector = company.contacts.filter((c) => c.directors.includes(directorId)).length;
        let width = 1;
        if (contactsForDirector >= 7) width = 3.5;
        else if (contactsForDirector >= 4) width = 2.5;
        else if (contactsForDirector >= 2) width = 1.5;

        conns.push({ from: directorId, to: company.id, path, color, width });
      });
    });

    return conns;
  }, [filteredCompanies, directorPositions, companyPositions]);

  // Build inter-company connections
  const interCompanyConnections = useMemo(() => {
    if (!data) return [];

    // Build contact ID to company ID lookup
    const contactToCompany = new Map<string, string>();
    data.contacts.forEach((contact) => {
      if (contact.company) {
        const companyId = contact.company.toLowerCase().trim();
        contactToCompany.set(contact.id, companyId);
      }
    });

    // Build set of filtered company IDs for quick lookup
    const filteredCompanyIds = new Set(filteredCompanies.map((c) => c.id));

    // Aggregate connections by company pair
    const connectionMap = new Map<string, number>();

    data.connections.forEach(({ from, to }) => {
      const companyA = contactToCompany.get(from);
      const companyB = contactToCompany.get(to);

      // Skip if either contact has no company
      if (!companyA || !companyB) return;

      // Skip if same company
      if (companyA === companyB) return;

      // Skip if either company is not in filtered list
      if (!filteredCompanyIds.has(companyA) || !filteredCompanyIds.has(companyB)) return;

      // Create alphabetically sorted key
      const key = companyA < companyB ? `${companyA}:${companyB}` : `${companyB}:${companyA}`;

      connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
    });

    // Convert to array with paths
    const connections: Array<{
      companyA: string;
      companyB: string;
      count: number;
      path: string;
    }> = [];

    connectionMap.forEach((count, key) => {
      const [companyA, companyB] = key.split(":");
      const posA = companyPositions.get(companyA);
      const posB = companyPositions.get(companyB);

      if (!posA || !posB) return;

      // Calculate bezier curve with perpendicular offset
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Perpendicular offset: 0.15 × distance, capped at 80px
      const offset = Math.min(distance * 0.15, 80);

      const midX = (posA.x + posB.x) / 2;
      const midY = (posA.y + posB.y) / 2;

      // Perpendicular direction
      const perpX = (-dy / distance) * offset;
      const perpY = (dx / distance) * offset;

      const cpX = midX + perpX;
      const cpY = midY + perpY;

      const path = `M ${posA.x} ${posA.y} Q ${cpX} ${cpY} ${posB.x} ${posB.y}`;

      connections.push({ companyA, companyB, count, path });
    });

    return connections;
  }, [data, filteredCompanies, companyPositions]);

  // Pan and zoom handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (compact) return;
      if ((e.target as HTMLElement).closest(".node")) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    },
    [compact, panX, panY]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (compact) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.3, Math.min(3, scale * delta));
      setScale(newScale);

      // Collapse expanded nodes if zoom < 1.5
      if (newScale < 1.5) {
        setExpandedNode(null);
      }
    },
    [compact, scale]
  );

  const handleDoubleClick = useCallback(() => {
    if (compact) return;
    setScale(1);
    setPanX(0);
    setPanY(0);
  }, [compact]);

  const resetView = useCallback(() => {
    setScale(1);
    setPanX(0);
    setPanY(0);
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(3, s * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(0.3, s / 1.2));
  }, []);

  // Node hover with delay for expansion
  const handleNodeHover = useCallback(
    (nodeId: string) => {
      setHoveredNode(nodeId);
      if (scale > 1.5 && !compact) {
        if (hoverTimer) clearTimeout(hoverTimer);
        const timer = setTimeout(() => {
          setExpandedNode(nodeId);
        }, 500);
        setHoverTimer(timer);
      }
    },
    [scale, compact, hoverTimer]
  );

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      setHoverTimer(null);
    }
  }, [hoverTimer]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`bg-white ${compact ? "rounded-2xl border border-gray-200" : ""}`} style={{ height: compact ? 520 : "100vh" }}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm text-gray-500 font-medium">Loading your network...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`bg-white ${compact ? "rounded-2xl border border-gray-200" : ""}`} style={{ height: compact ? 520 : "100vh" }}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-600 font-medium">Couldn't load your network</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || companyNodes.length === 0) {
    return (
      <div className={`bg-white ${compact ? "rounded-2xl border border-gray-200" : ""}`} style={{ height: compact ? 520 : "100vh" }}>
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-gray-500 font-medium">No contacts yet. Import contacts to Monday.com to get started.</p>
        </div>
      </div>
    );
  }

  const activeDirector = DIRECTORS.find((d) => d.id === loggedInDirector);

  return (
    <div
      className={`relative bg-white ${compact ? "rounded-2xl border border-gray-200" : ""} overflow-hidden`}
      style={{ height: compact ? 520 : "100vh" }}
    >
      {/* Header */}
      {compact ? (
        <div className="absolute top-0 left-0 right-0 z-20 px-6 py-4 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeDirector && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeDirector.color }} />}
              <h3 className="text-base font-semibold text-gray-900">
                {activeDirector ? `${activeDirector.name}'s Network` : "Network Map"}
              </h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-xs">
                <Link
                  href="/dashboard/sales/network?filter=active"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="font-medium text-gray-700">{stats.active} active</span>
                </Link>
                <Link
                  href="/dashboard/sales/network?filter=cooling"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="font-medium text-gray-700">{stats.cooling} cooling</span>
                </Link>
                <Link
                  href="/dashboard/sales/network?filter=atrisk"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-medium text-gray-700">{stats.atRisk} at risk</span>
                </Link>
              </div>
              <Link href="/dashboard/sales/network" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Open full view →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute top-0 left-0 right-0 z-20 px-8 py-4 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search contacts or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-60 px-4 py-2 pl-10 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="w-px h-8 bg-gray-200" />

            {/* Timeframe */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(["7d", "30d", "90d", "6mo", "All"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    timeframe === tf ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-gray-200" />

            {/* Director filters */}
            <div className="flex items-center gap-2">
              {DIRECTORS.map((director) => (
                <button
                  key={director.id}
                  onClick={() => setDirectorFilters((prev) => ({ ...prev, [director.id]: !prev[director.id] }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    directorFilters[director.id] ? "text-white shadow-sm" : "text-gray-400 border border-gray-200 hover:border-gray-300"
                  }`}
                  style={{
                    backgroundColor: directorFilters[director.id] ? director.color : "white",
                  }}
                >
                  {director.name}
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-gray-200" />

            {/* Type filters */}
            <div className="flex items-center gap-2">
              {(["clients", "agents", "consultants"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilters((prev) => ({ ...prev, [type]: !prev[type] }))}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    typeFilters[type] ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Show relationships toggle */}
            <button
              onClick={() => setShowRelationships(!showRelationships)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showRelationships ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {showRelationships ? "Hide relationships" : "Show relationships"}
            </button>

            {/* Recency legend */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {[
                { color: "#22C55E", label: "<30d" },
                { color: "#86EFAC", label: "1-3mo" },
                { color: "#FACC15", label: "3-6mo" },
                { color: "#F97316", label: "6-12mo" },
                { color: "#9CA3AF", label: "1yr+" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main canvas */}
      <div
        ref={containerRef}
        className="relative w-full h-full"
        style={{
          paddingTop: compact ? 64 : 68,
          cursor: isPanning ? "grabbing" : "grab",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          ref={svgRef}
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <g transform={`translate(${panX}, ${panY}) scale(${scale})`}>
            {/* Inter-company connections */}
            {showRelationships && (
              <g>
                {interCompanyConnections.map((conn, i) => {
                  const isHighlighted = hoveredNode === conn.companyA || hoveredNode === conn.companyB;
                  const strokeWidth = 0.8 + Math.min(conn.count, 4) * 0.4;
                  const opacity = isHighlighted ? 0.75 : 0.25;

                  return (
                    <path
                      key={i}
                      d={conn.path}
                      stroke="#475569"
                      strokeWidth={strokeWidth}
                      fill="none"
                      opacity={opacity}
                      style={{ transition: "opacity 0.3s ease" }}
                    />
                  );
                })}
              </g>
            )}

            {/* Connections */}
            <g opacity={showRelationships ? 0.35 : 0.4}>
              {connections.map((conn, i) => {
                const isHighlighted =
                  !hoveredNode ||
                  hoveredNode === conn.from ||
                  hoveredNode === conn.to ||
                  (hoveredNode && filteredCompanies.find((c) => c.id === hoveredNode)?.directors.has(conn.from));
                return (
                  <path
                    key={i}
                    d={conn.path}
                    stroke={conn.color}
                    strokeWidth={conn.width}
                    fill="none"
                    opacity={isHighlighted ? 1 : (showRelationships ? 0.08 : 0.12)}
                    style={{ transition: "opacity 0.3s ease" }}
                  />
                );
              })}
            </g>

            {/* Director nodes */}
            {Array.from(directorPositions.entries()).map(([dirId, pos]) => {
              const director = DIRECTORS.find((d) => d.id === dirId)!;
              const isHighlighted = !hoveredNode || hoveredNode === dirId;

              return (
                <g
                  key={dirId}
                  className="node"
                  transform={`translate(${pos.x}, ${pos.y})`}
                  opacity={isHighlighted ? 1 : 0.12}
                  style={{ transition: "opacity 0.3s ease" }}
                  onMouseEnter={() => setHoveredNode(dirId)}
                  onMouseLeave={handleNodeLeave}
                >
                  <circle r={compact ? 28 : 36} fill="white" stroke={director.color} strokeWidth={4} />
                  <image
                    href={director.photo}
                    x={compact ? -24 : -32}
                    y={compact ? -24 : -32}
                    width={compact ? 48 : 64}
                    height={compact ? 48 : 64}
                    clipPath="circle()"
                  />
                </g>
              );
            })}

            {/* Company nodes */}
            {filteredCompanies.map((company) => {
              const pos = companyPositions.get(company.id);
              if (!pos) return null;

              const typeColor = getTypeColor(company.type);
              const recencyRing = getRecencyRing(company.daysSinceContact);
              const isHighlighted =
                !hoveredNode ||
                hoveredNode === company.id ||
                (hoveredNode && company.directors.has(hoveredNode));

              return (
                <g
                  key={company.id}
                  className="node"
                  transform={`translate(${pos.x}, ${pos.y})`}
                  opacity={isHighlighted ? 1 : 0.12}
                  style={{
                    transition: "opacity 0.3s ease, transform 0.2s ease",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => handleNodeHover(company.id)}
                  onMouseLeave={handleNodeLeave}
                  onClick={() => setSelectedCompany(company)}
                >
                  {/* Recency ring */}
                  {recencyRing && <circle r={company.radius + 4} fill="none" stroke={recencyRing} strokeWidth={3} />}

                  {/* Main circle */}
                  <circle r={company.radius} fill={typeColor.bg} stroke={typeColor.border} strokeWidth={2} />

                  {/* Company initial */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={company.radius * 0.6}
                    fontWeight="600"
                    fill={typeColor.primary}
                  >
                    {company.name[0].toUpperCase()}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover tooltip */}
        {hoveredNode && !DIRECTORS.find((d) => d.id === hoveredNode) && (
          <HoverTooltip company={filteredCompanies.find((c) => c.id === hoveredNode)!} />
        )}

        {/* Zoom controls (full mode only) */}
        {!compact && (
          <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
            <button
              onClick={zoomIn}
              className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded transition-colors"
              aria-label="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={zoomOut}
              className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded transition-colors"
              aria-label="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={resetView}
              className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded transition-colors"
              aria-label="Reset view"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedCompany && !compact && <DetailPanel company={selectedCompany} onClose={() => setSelectedCompany(null)} />}

      {/* Compact popup */}
      {selectedCompany && compact && <CompactPopup company={selectedCompany} onClose={() => setSelectedCompany(null)} />}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function HoverTooltip({ company }: { company: CompanyNode }) {
  const recency = getRecencyLabel(company.daysSinceContact);

  return (
    <div className="fixed z-50 pointer-events-none" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
      <div
        className="px-3 py-2 rounded-lg shadow-xl text-white"
        style={{
          backgroundColor: "rgba(20, 20, 23, 0.92)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="text-sm font-semibold">{company.name}</div>
        <div className="text-xs text-gray-300 mt-1">
          {company.type.charAt(0).toUpperCase() + company.type.slice(1)} · {company.contactCount} contact{company.contactCount !== 1 ? "s" : ""}
        </div>
        {company.daysSinceContact !== null ? (
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: recency.color }} />
            <span className="text-xs text-gray-400">Last contacted {company.daysSinceContact} days ago</span>
          </div>
        ) : (
          <div className="text-xs text-gray-400 mt-1">No recent contact logged</div>
        )}
        <div className="text-xs text-gray-500 mt-2">Click for details</div>
      </div>
    </div>
  );
}

function DetailPanel({ company, onClose }: { company: CompanyNode; onClose: () => void }) {
  const recency = getRecencyLabel(company.daysSinceContact);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/10 z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl border-l border-gray-200 z-50 overflow-y-auto"
        style={{
          animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <style jsx>{`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }
        `}</style>

        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-5 flex items-start justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
              {company.domain ? (
                <img
                  src={`https://logo.clearbit.com/${company.domain}`}
                  alt={company.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const parent = target.parentElement;
                    if (parent) {
                      const typeColor = getTypeColor(company.type);
                      parent.style.backgroundColor = typeColor.bg;
                      parent.innerHTML = `<div class="text-4xl font-bold" style="color: ${typeColor.primary}">${company.name[0]}</div>`;
                    }
                  }}
                />
              ) : (
                <div className="text-4xl font-bold" style={{ color: getTypeColor(company.type).primary }}>
                  {company.name[0]}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: getTypeColor(company.type).bg,
                    color: getTypeColor(company.type).primary,
                  }}
                >
                  {company.type.charAt(0).toUpperCase() + company.type.slice(1)}
                </span>
                {company.priority && (
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      company.priority === "High"
                        ? "bg-red-100 text-red-700"
                        : company.priority === "Medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {company.priority}
                  </span>
                )}
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: recency.color }}
                >
                  {recency.label}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Contacts */}
        <div className="px-6 py-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Contacts ({company.contactCount})</h4>
          <div className="space-y-3">
            {company.contacts.map((contact) => {
              const contactRecency = getRecencyLabel(
                contact.lastContacted
                  ? Math.floor((new Date().getTime() - new Date(contact.lastContacted).getTime()) / (1000 * 60 * 60 * 24))
                  : null
              );
              return (
                <div key={contact.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm text-gray-900">{contact.name}</div>
                        <div className="flex gap-1">
                          {contact.directors.map((dirId) => {
                            const director = DIRECTORS.find((d) => d.id === dirId);
                            return director ? (
                              <div
                                key={dirId}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: director.color }}
                                title={director.name}
                              />
                            ) : null;
                          })}
                        </div>
                      </div>
                      {contact.position && <div className="text-xs text-gray-600 mt-0.5">{contact.position}</div>}
                      {contact.email && (
                        <button
                          onClick={() => navigator.clipboard.writeText(contact.email)}
                          className="text-xs text-blue-600 hover:underline mt-1 block text-left"
                          title="Click to copy"
                        >
                          {contact.email}
                        </button>
                      )}
                      {contact.lastContacted && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last contacted: {new Date(contact.lastContacted).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        {company.contacts.some((c) => c.notes) && (
          <div className="px-6 py-5 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Notes</h4>
            <div className="space-y-2">
              {company.contacts
                .filter((c) => c.notes)
                .slice(0, 3)
                .map((contact) => (
                  <div key={contact.id} className="text-sm text-gray-600">
                    <span className="font-medium">{contact.name}:</span> {contact.notes}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-5 border-t border-gray-100">
          <div className="flex gap-3">
            <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
              Set Follow-up
            </button>
            <a
              href="https://white-red.monday.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
            >
              Open in Monday
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function CompactPopup({ company, onClose }: { company: CompanyNode; onClose: () => void }) {
  const recency = getRecencyLabel(company.daysSinceContact);

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
            {company.domain ? (
              <img
                src={`https://logo.clearbit.com/${company.domain}`}
                alt={company.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    const typeColor = getTypeColor(company.type);
                    parent.style.backgroundColor = typeColor.bg;
                    parent.innerHTML = `<div class="text-3xl font-bold" style="color: ${typeColor.primary}">${company.name[0]}</div>`;
                  }
                }}
              />
            ) : (
              <div className="text-3xl font-bold" style={{ color: getTypeColor(company.type).primary }}>
                {company.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{company.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: getTypeColor(company.type).bg,
                  color: getTypeColor(company.type).primary,
                }}
              >
                {company.type.charAt(0).toUpperCase() + company.type.slice(1)}
              </span>
              <span className="text-xs text-gray-500">{company.contactCount} contacts</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Link
          href="/dashboard/sales/network"
          className="block w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors text-center"
        >
          View in full map
        </Link>
      </div>
    </div>
  );
}
