"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
  onUploaded: () => void;
}

export function HeadshotDialog({ open, onOpenChange, personId, personName, onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setFile(null);
      setPreview(null);
      setUrlInput("");
      setDragging(false);
      setBusy(false);
      setError("");
    }
  }, [open]);

  const pickFile = (picked: File | undefined) => {
    if (!picked || !picked.type.startsWith("image/")) return;
    setFile(picked);
    setError("");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(picked);
  };

  const handleUpload = async () => {
    const url = urlInput.trim();
    if (!file && !url) {
      setError("Drop an image or paste a URL first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("personId", personId);
      if (file) form.append("file", file);
      else form.append("url", url);

      const res = await fetch("/api/headshots", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Upload failed");
      }
      onUploaded();
      onOpenChange(false);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}>
            Add photo
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {personName} — the image is centre-cropped to a square headshot.
          </DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          aria-label="Drop an image here or click to choose a file"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={e => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
            dragging ? "border-[#DC2626] bg-red-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          }`}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Preview"
                className="h-24 w-24 rounded-full border border-gray-200 object-cover"
              />
              <p className="max-w-full truncate text-xs text-gray-600">{file?.name}</p>
            </>
          ) : (
            <p className="text-center text-sm text-gray-500">
              Drag &amp; drop an image here
              <br />
              <span className="text-xs text-gray-400">or click to choose a file</span>
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => pickFile(e.target.files?.[0] ?? undefined)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="headshot-url">Or image URL</Label>
          <Input
            id="headshot-url"
            placeholder="https://example.com/photo.jpg"
            value={urlInput}
            onChange={e => {
              setUrlInput(e.target.value);
              setError("");
            }}
            disabled={!!file || busy}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            onClick={handleUpload}
            disabled={busy || (!file && !urlInput.trim())}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Uploading…
              </span>
            ) : (
              "Upload"
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
