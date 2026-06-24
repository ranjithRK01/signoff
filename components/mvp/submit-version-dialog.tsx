"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { submitNewVersion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SubmitVersionDialog({
  reviewId,
  projectId,
  defaultUrl,
  onSubmitted,
}: {
  reviewId: string;
  projectId: string;
  defaultUrl: string;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(defaultUrl);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error("Live URL is required.");
      return;
    }
    try {
      setLoading(true);
      await submitNewVersion({
        reviewId,
        projectId,
        liveUrl: url.trim(),
        releaseNotes: notes.trim() || undefined,
        submittedBy: "user-dev",
        submittedByLabel: "Dev Team",
      });
      toast.success("New version submitted. Working items moved to ready for review.");
      setOpen(false);
      setNotes("");
      onSubmitted();
    } catch {
      toast.error("Failed to submit version.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold border-border"
          />
        }
      >
        Submit new version
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Submit new version</DialogTitle>
            <DialogDescription>
              Creates the next version. All items in Working automatically become Ready for
              review.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="liveUrl">Live URL</Label>
              <Input
                id="liveUrl"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="font-mono text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="releaseNotes">Release notes</Label>
              <Textarea
                id="releaseNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What changed in this build?"
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit version"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
