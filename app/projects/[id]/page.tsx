"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Video, Image as ImageIcon, Copy, ExternalLink, Plus, Loader2, Play, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getProject, getReviews, getComments, createReview, updateProject, Project, Review } from "@/lib/api";

function avatarText(emailOrName: string) {
  const base = (emailOrName || "").trim();
  if (!base) return "?";
  const local = base.includes("@") ? base.split("@")[0] : base;
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  const a = parts[0]?.[0] || local[0];
  const b = parts[1]?.[0] || local[1] || "";
  return (a + b).toUpperCase();
}

type ReviewCommentStats = {
  total: number;
  resolved: number;
  open: number;
};

function commentColor(stats: ReviewCommentStats) {
  if (stats.total === 0) return "bg-zinc-200 text-zinc-700";
  if (stats.open === 0) return "bg-emerald-100 text-emerald-800";
  const openRatio = stats.open / stats.total;
  if (openRatio < 0.5) return "bg-amber-100 text-amber-900";
  return "bg-rose-100 text-rose-900";
}

function ReviewRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4 px-6 border border-border bg-white rounded-lg animate-pulse">
      <div className="w-16 h-10 bg-zinc-200 rounded"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-zinc-200 rounded w-1/4"></div>
        <div className="h-3 bg-zinc-100 rounded w-1/6"></div>
      </div>
      <div className="h-5 bg-zinc-200 rounded w-16"></div>
      <div className="h-8 bg-zinc-100 rounded w-28"></div>
      <div className="h-8 bg-zinc-100 rounded w-20"></div>
    </div>
  );
}

function getEmbedUrl(url: string): string {
  if (!url) return "";
  
  if (url.includes("youtube.com/watch")) {
    const videoId = url.split("v=")[1]?.split("&")[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes("youtu.be/")) {
    const videoId = url.split("youtu.be/")[1]?.split("?")[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }
  if (url.includes("loom.com/share/")) {
    const shareId = url.split("loom.com/share/")[1]?.split("?")[0];
    if (shareId) return `https://www.loom.com/embed/${shareId}?hide_owner=true&hide_share=true&hide_title=true&hide_embed_topbar=true`;
  }
  if (url.includes("vimeo.com/")) {
    const vimeoId = url.split("vimeo.com/")[1]?.split("?")[0];
    if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
  }
  return url;
}

export default function ProjectDetailPage() {
  const { id } = useParams() as { id: string };
  
  const [project, setProject] = useState<Project | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [commentStats, setCommentStats] = useState<Record<string, ReviewCommentStats>>({});

  // Invite states
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Add Review Modal Wizard Flow
  const [step, setStep] = useState(1);
  const [reviewType, setReviewType] = useState<"video" | "image" | null>(null);
  
  // Review form states
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageData, setImageData] = useState(""); 
  const [fileName, setFileName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const proj = await getProject(id);
      const revs = await getReviews(id);
      
      setProject(proj);
      setReviews(revs);

      const statsEntries = await Promise.all(
        revs.map(async (r) => {
          try {
            const comms = await getComments(r.id);
            const total = comms.length;
            const resolved = comms.filter((c) => c.resolved).length;
            const open = total - resolved;
            return [r.id, { total, resolved, open }] as const;
          } catch {
            return [r.id, { total: 0, resolved: 0, open: 0 }] as const;
          }
        })
      );
      setCommentStats(Object.fromEntries(statsEntries));
    } catch (error) {
      console.error("Error fetching detail data:", error);
      toast.error("Failed to load project details.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyLink = (reviewId: string) => {
    const magicLink = `${window.location.origin}/review/${reviewId}`;
    navigator.clipboard.writeText(magicLink);
    toast.success("Link copied to clipboard 📋");
  };

  const handleCopyProjectLink = () => {
    if (!project) return;
    const projectLink = `${window.location.origin}/review/project/${project.id}`;
    navigator.clipboard.writeText(projectLink);
    toast.success("Project magic link copied 📋");
  };

  const handleInviteReviewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !inviteEmail.trim()) return;

    const email = inviteEmail.trim().toLowerCase();

    // Validations
    if (email === project.clientEmail.toLowerCase()) {
      toast.error("This email is already the primary client of this project.");
      return;
    }
    if (project.invitedEmails?.some((e) => e.toLowerCase() === email)) {
      toast.error("This email has already been invited.");
      return;
    }

    try {
      setIsInviting(true);
      const updatedEmails = [...(project.invitedEmails || []), inviteEmail.trim()];
      
      await updateProject(project.id, { invitedEmails: updatedEmails });
      toast.success("Reviewer invited successfully! ✉️");
      setInviteEmail("");
      
      // Refresh project info
      const updatedProj = await getProject(project.id);
      setProject(updatedProj);
    } catch (error) {
      console.error("Error inviting reviewer:", error);
      toast.error("Failed to invite reviewer.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !reviewType) {
      toast.error("Title is required.");
      return;
    }

    if (reviewType === "video" && !videoUrl) {
      toast.error("Video URL is required.");
      return;
    }

    if (reviewType === "image" && !imageFile) {
      toast.error("Please upload an image.");
      return;
    }

    try {
      setIsSubmitLoading(true);

      let uploadedUrl: string | undefined = undefined;
      if (reviewType === "image" && imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) throw new Error("Image upload failed");
        const uploadData = await uploadRes.json();
        uploadedUrl = uploadData.url;
      }

      const newReviewData = {
        projectId: id,
        title,
        type: reviewType,
        url: reviewType === "video" ? getEmbedUrl(videoUrl) : undefined,
        fileData: reviewType === "image" ? uploadedUrl : undefined,
      };

      await createReview(newReviewData);
      toast.success("Review added successfully ✅");
      setIsModalOpen(false);
      
      setStep(1);
      setReviewType(null);
      setTitle("");
      setVideoUrl("");
      setImageFile(null);
      setImageData("");
      setFileName("");
      
      fetchData();
    } catch (error) {
      console.error("Error adding review:", error);
      toast.error("Failed to add review.");
    } finally {
      setIsSubmitLoading(false);
    }
  };

  if (!project && !isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold mb-4">Project not found.</p>
        <Link href="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">{project?.name || "Loading..."}</h1>
          {project && (
            <p className="text-xs text-muted-foreground font-medium mt-1">
              Client: <span className="text-zinc-700">{project.clientName}</span> ({project.clientEmail})
            </p>
          )}

          {project && (
            <div className="flex items-center gap-2 mt-3">
              <div className="flex -space-x-2">
                <div
                  className="h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                  title="Agency"
                >
                  AG
                </div>
                <div
                  className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                  title={`${project.clientName} (${project.clientEmail})`}
                >
                  {avatarText(project.clientName || project.clientEmail)}
                </div>
                {(project.invitedEmails || []).slice(0, 6).map((email) => (
                  <div
                    key={email}
                    className="h-7 w-7 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                    title={email}
                  >
                    {avatarText(email)}
                  </div>
                ))}
              </div>
              <span className="text-[11px] text-muted-foreground font-semibold">
                {(project.invitedEmails?.length || 0) + 2} reviewers
              </span>
            </div>
          )}
        </div>
        
        {project && (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCopyProjectLink}
              variant="outline"
              className="border-border bg-white hover:bg-zinc-50 text-zinc-800 rounded-md h-10 px-3 text-sm font-semibold flex items-center gap-2"
            >
              <Copy className="h-4 w-4" /> Copy workspace link
            </Button>

            <Dialog
              open={isInviteOpen}
              onOpenChange={(open) => {
                setIsInviteOpen(open);
                if (!open) setInviteEmail("");
              }}
            >
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    className="border-border bg-white hover:bg-zinc-50 text-zinc-800 rounded-md h-10 px-3 text-sm font-semibold flex items-center gap-2"
                  />
                }
              >
                <Mail className="h-4 w-4 text-indigo-600" /> Invite reviewer
              </DialogTrigger>
              <DialogContent className="sm:max-w-[420px] bg-white">
                <form
                  onSubmit={async (e) => {
                    await handleInviteReviewer(e);
                    // If successful, close dialog (heuristic: inviteEmail cleared)
                    if (!inviteEmail.trim()) setIsInviteOpen(false);
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Invite reviewer</DialogTitle>
                    <DialogDescription>
                      Add a client reviewer by email. They can access the project workspace via the link.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="inviteEmailTop">Reviewer email</Label>
                      <Input
                        id="inviteEmailTop"
                        type="email"
                        placeholder="reviewer@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        className="border-border rounded-md"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={isInviting}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
                    >
                      {isInviting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inviting...
                        </>
                      ) : (
                        "Invite"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isModalOpen}
              onOpenChange={(open) => {
                setIsModalOpen(open);
                if (!open) {
                  setStep(1);
                  setReviewType(null);
                  setTitle("");
                  setVideoUrl("");
                  setImageFile(null);
                  setImageData("");
                  setFileName("");
                }
              }}
            >
              <DialogTrigger
                render={<Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-md flex items-center gap-2 h-10" />}
              >
                <Plus className="h-4 w-4" /> Add review
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] bg-white">
              {step === 1 && (
                <>
                  <DialogHeader>
                    <DialogTitle>Choose Review Type</DialogTitle>
                    <DialogDescription>
                      Select what type of asset you want to upload for the client to review.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-6">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewType("video");
                        setStep(2);
                      }}
                      className="flex flex-col items-center justify-center p-6 border border-border hover:border-indigo-500 rounded-lg hover:bg-indigo-50/20 text-center gap-3 transition group"
                    >
                      <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                        <Video className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-sm text-zinc-800">🎥 Video URL</span>
                      <span className="text-[10px] text-muted-foreground leading-normal">
                        Paste Cap, Loom, or YouTube share links
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReviewType("image");
                        setStep(2);
                      }}
                      className="flex flex-col items-center justify-center p-6 border border-border hover:border-indigo-500 rounded-lg hover:bg-indigo-50/20 text-center gap-3 transition group"
                    >
                      <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-sm text-zinc-800">🖼 Image Upload</span>
                      <span className="text-[10px] text-muted-foreground leading-normal">
                        Upload png, jpeg, or gif files directly
                      </span>
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add {reviewType === "video" ? "Video" : "Image"} Review</DialogTitle>
                    <DialogDescription>
                      Provide details for the review file.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Review Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Summer Video Cut v2"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="border-border rounded-md"
                      />
                    </div>

                    {reviewType === "video" ? (
                      <div className="grid gap-2">
                        <Label htmlFor="videoUrl">Video URL (Loom, YouTube, Vimeo)</Label>
                        <Input
                          id="videoUrl"
                          placeholder="e.g., https://www.loom.com/share/..."
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          required
                          className="border-border rounded-md"
                        />
                        {videoUrl && (
                          <div className="mt-2 border border-border rounded overflow-hidden aspect-video bg-zinc-50 flex items-center justify-center">
                            <iframe
                              src={getEmbedUrl(videoUrl)}
                              frameBorder="0"
                              allowFullScreen
                              className="w-full h-full"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Label htmlFor="imageFile">Image File</Label>
                        <div className="border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-zinc-50 relative">
                          <Input
                            id="imageFile"
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            required={!imageData}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-xs font-semibold text-zinc-700">
                            {fileName || "Click to browse images"}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-1">PNG, JPEG, GIF up to 5MB</span>
                        </div>
                        {imageData && (
                          <div className="mt-2 border border-border rounded-md overflow-hidden bg-zinc-100 flex justify-center max-h-40">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imageData}
                              alt="Upload preview"
                              className="object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <DialogFooter className="flex gap-2 sm:justify-between items-center w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="border-border rounded-md"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitLoading}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-md"
                    >
                      {isSubmitLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                        </>
                      ) : (
                        "Create Review"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Files list (Filestage-style) */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            <ReviewRowSkeleton />
            <ReviewRowSkeleton />
          </div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={Video}
            message="No files yet — add your first one"
            action={
              <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-md">
                Add review
              </Button>
            }
          />
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-white divide-y divide-border shadow-sm">
            {reviews.map((review) => {
              const date = new Date(review.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });
              const stats = commentStats[review.id] || { total: 0, resolved: 0, open: 0 };

              return (
                <div key={review.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:px-6 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative w-16 h-10 rounded border border-border bg-zinc-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {review.type === "video" ? (
                        <div className="relative w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                          <Play className="h-4 w-4 fill-white/80" />
                        </div>
                      ) : (
                        <Link
                          href={`/projects/${id}/reviews/${review.id}`}
                          className="block w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                          title="Open review"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={review.fileData} alt="thumbnail" className="w-full h-full object-cover" />
                        </Link>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                        {review.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">Added {date}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">•</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">
                          {review.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reviewers + comment status (fills the middle space) */}
                  <div className="flex items-center gap-3 sm:justify-center sm:flex-1">
                    <div className="hidden md:flex items-center -space-x-2">
                      <div
                        className="h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                        title="Agency"
                      >
                        AG
                      </div>
                      {project ? (
                        <div
                          className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                          title={`${project.clientName} (${project.clientEmail})`}
                        >
                          {avatarText(project.clientName || project.clientEmail)}
                        </div>
                      ) : null}
                      {(project?.invitedEmails || []).slice(0, 3).map((email) => (
                        <div
                          key={email}
                          className="h-7 w-7 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                          title={email}
                        >
                          {avatarText(email)}
                        </div>
                      ))}
                      {(project?.invitedEmails?.length || 0) > 3 ? (
                        <div
                          className="h-7 w-7 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-[10px] font-bold ring-2 ring-white"
                          title={`${(project?.invitedEmails?.length || 0) - 3} more`}
                        >
                          +{(project?.invitedEmails?.length || 0) - 3}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${commentColor(stats)}`}
                      title={
                        stats.total === 0
                          ? "No comments yet"
                          : `${stats.total} total • ${stats.open} open • ${stats.resolved} resolved`
                      }
                    >
                      {stats.total === 0 ? `${stats.total} comments` : `${stats.total} comments • ${stats.open} open`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={review.status} />

                    <div className="flex items-center gap-2">
                      <Link href={`/projects/${id}/reviews/${review.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-border text-xs rounded-md font-medium text-zinc-800 bg-white hover:bg-zinc-50 flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Open
                        </Button>
                      </Link>
                      <Button
                        onClick={() => handleCopyLink(review.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 border-border text-xs rounded-md font-medium text-zinc-600 bg-white hover:bg-zinc-50 flex items-center gap-1"
                      >
                        <Copy className="h-3 w-3" /> Copy link
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
