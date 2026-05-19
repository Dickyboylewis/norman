"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (url: string) => void;
  currentUrl?: string | null;
}

export function ProjectImagePicker({ open, onOpenChange, onSave, currentUrl }: Props) {
  const [urlInput, setUrlInput] = useState(currentUrl ?? "");
  const [urlError, setUrlError] = useState("");
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);

  const handleUrlSave = () => {
    const v = urlInput.trim();
    if (!v || (!v.startsWith("http://") && !v.startsWith("https://") && !v.startsWith("data:"))) {
      setUrlError("Please enter a valid URL starting with http://, https://, or data:");
      return;
    }
    setUrlError("");
    onSave(v);
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFileDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileSave = () => {
    if (!fileDataUrl) return;
    onSave(fileDataUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: "Poppins, sans-serif" }}>
            Update project image
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Paste an image URL or upload a photo. Stored in your browser only.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1">Paste URL</TabsTrigger>
            <TabsTrigger value="upload" className="flex-1">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label htmlFor="img-url">Image URL</Label>
              <Input
                id="img-url"
                placeholder="https://example.com/image.jpg"
                value={urlInput}
                onChange={e => { setUrlInput(e.target.value); setUrlError(""); }}
              />
              {urlError && <p className="text-xs text-red-600">{urlError}</p>}
            </div>
            <Button
              className="w-full bg-[#DA2C26] hover:bg-[#B82420] text-white"
              onClick={handleUrlSave}
            >
              Save
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="space-y-3 mt-4">
            <div className="space-y-1">
              <Label htmlFor="img-file">Choose image</Label>
              <input
                id="img-file"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700 file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
            </div>
            {fileDataUrl && (
              <img
                src={fileDataUrl}
                alt="Preview"
                className="w-[120px] h-[120px] rounded-lg object-cover border border-gray-200"
              />
            )}
            <Button
              className="w-full bg-[#DA2C26] hover:bg-[#B82420] text-white"
              onClick={handleFileSave}
              disabled={!fileDataUrl}
            >
              Save
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
