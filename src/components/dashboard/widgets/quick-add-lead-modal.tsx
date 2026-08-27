"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ContactResult {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: string;
  statusColor: string;
}

const SEARCH_DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const CLOSE_DELAY_MS = 1000;

export function QuickAddLeadModal({ open, onOpenChange, status, statusColor }: Props) {
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ContactResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [posting, setPosting] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState("");
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setTerm("");
      setResults([]);
      setSearching(false);
      setPosting(false);
      setAdded(false);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = term.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/contacts-search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data : []);
        } else {
          setResults([]);
        }
        setSearching(false);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          setResults([]);
          setSearching(false);
        }
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [term, open]);

  const pickContact = async (contact: ContactResult) => {
    if (posting || added) return;
    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/quick-add-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, contactItemId: contact.id, contactName: contact.name }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Couldn't add the lead");
      }
      setPosting(false);
      setAdded(true);
      void queryClient.invalidateQueries({ queryKey: ["monday"] });
      closeTimer.current = window.setTimeout(() => onOpenChange(false), CLOSE_DELAY_MS);
    } catch (err) {
      setPosting(false);
      setError(err instanceof Error ? err.message : "Couldn't add the lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            <span
              className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: statusColor }}
            />
            Add {status} lead
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Search the Contacts board, then click a name to create the lead.
          </DialogDescription>
        </DialogHeader>

        <Input
          autoFocus
          placeholder="Search contacts…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          disabled={posting || added}
        />

        {added ? (
          <p className="text-sm font-semibold text-green-600">Lead added</p>
        ) : posting ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#DA2C26]" />
            Adding lead…
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {searching ? (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-[#DA2C26]" />
                Searching…
              </div>
            ) : results.length ? (
              <ul className="divide-y divide-gray-100">
                {results.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => pickContact(contact)}
                      className="w-full rounded-md px-2 py-2 text-left text-sm text-gray-900 transition-colors hover:bg-red-50"
                    >
                      {contact.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : term.trim().length >= MIN_QUERY_LENGTH ? (
              <p className="py-2 text-sm text-gray-400">No contacts match</p>
            ) : null}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
