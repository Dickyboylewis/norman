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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  title: string;
  currentUrl?: string | null;
}

export function ProjectImagePicker({ open, onOpenChange, code, title, currentUrl }: Props) {
  const queryClient = useQueryClient();
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

  const finish = async () => {
    await queryClient.invalidateQueries({ queryKey: ["project-images"] });
    onOpenChange(false);
  };

  const handleSave = async () => {
    const url = urlInput.trim();
    if (!file && !url) {
      setError("Drop an image or paste a URL first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("code", code);
      if (file) form.append("file", file);
      else form.append("url", url);

      const res = await fetch("/api/project-images", { method: "POST", body: form });
      if (!res.ok) throw new Error("save failed");
      await finish();
    } catch {
      setError("Couldn't save the image. Please try again.");
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/project-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) throw new Error("remove failed");
      await finish();
    } catch {
      setError("Couldn't remove the image. Please try again.");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Poppins, sans-serif" }}>
            Project image
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {code} · {title} — drop a photo or paste an image URL. Shared with the whole team.
          </DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          aria-label="Drop an image here or click to choose a file"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pickFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
            dragging ? "border-[#DA2C26] bg-[#FDF2F2]" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
          }`}
        >
          {preview ? (
            <>
              <img
                src={preview}
                alt="Preview"
                className="w-[96px] h-[96px] rounded-full object-cover border border-gray-200"
              />
              <p className="text-xs text-gray-600 truncate max-w-full" style={{ fontFamily: "Roboto, sans-serif" }}>
                {file?.name}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center" style={{ fontFamily: "Roboto, sans-serif" }}>
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
            onChange={(e) => pickFile(e.target.files?.[0] ?? undefined)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="img-url">Or image URL</Label>
          <Input
            id="img-url"
            placeholder="https://example.com/image.jpg"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              setError("");
            }}
            disabled={!!file}
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button
            className="flex-1 bg-[#DA2C26] hover:bg-[#B82420] text-white"
            onClick={handleSave}
            disabled={busy || (!file && !urlInput.trim())}
          >
            {busy ? "Saving…" : "Save"}
          </Button>
          {currentUrl && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleRemove}
              disabled={busy}
            >
              Remove image
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
