"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/dashboard/topbar";
import { ProjectCard } from "@/components/dashboard/widgets/project-card";
import type { ProjectData } from "@/app/api/projects/route";

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4">
      <div className="w-20 h-20 flex-shrink-0 rounded-full bg-gray-200 animate-pulse" />
      <div className="flex-1 h-24 rounded-full bg-gray-200 animate-pulse" />
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setProjects)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Projects" />

      <div className="flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" style={{ fontFamily: "Poppins, sans-serif" }}>
            Live Projects
          </h1>
          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "Roboto, sans-serif" }}>
            Click any project to see the full breakdown
          </p>
          <p className="text-xs text-gray-400 mt-2" style={{ fontFamily: "Roboto, sans-serif" }}>
            Showing 8 placeholder projects. Live CMap data coming soon.
          </p>
        </div>

        {error && (
          <p className="text-center text-red-600 text-sm">Couldn&apos;t load projects</p>
        )}

        {loading && !error && (
          <div className="space-y-4">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {projects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
