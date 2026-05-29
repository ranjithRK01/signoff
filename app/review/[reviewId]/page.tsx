"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { RotateCcw, Play, Pause, Clock, HelpCircle, Check, Loader2, Lock, User, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

import { getProject, getReview, getComments, createComment, updateReview, Project, Review, Comment } from "@/lib/api";
import { getCurrentVersionNumber, getVersionAsset } from "@/lib/reviewVersions";
import { PinCommentDock } from "@/components/review/pin-comment-dock";
import { VersionComparePanel, VersionToolbar } from "@/components/review/version-toolbar";
import {
  ImageAnnotationCanvas,
  type AnnotationTool,
  type PendingAnnotation,
} from "@/components/review/image-annotation-canvas";
import { CommentBody } from "@/components/review/comment-body";
import { htmlToPlainText, isCommentEmpty } from "@/lib/commentText";

export default function ClientReviewPage() {
  const { reviewId } = useParams() as { reviewId: string };

  const [project, setProject] = useState<Project | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Submit state triggers
  const [isApproved, setIsApproved] = useState(false);
  const [isRevision, setIsRevision] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

  // Client authentication/authorization
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Client feedback states
  const [overallNote, setOverallNote] = useState("");
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [viewAnyway, setViewAnyway] = useState(false);
  
  // Image annotation state
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("pin");
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [pinCommentText, setPinCommentText] = useState("");

  // Video Timer State
  const [videoDuration] = useState(180);
  const [videoTime, setVideoTime] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCommentText, setVideoCommentText] = useState("");
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Autocomplete suggestions state
  const [activeInputType, setActiveInputType] = useState<"pin" | "video" | "general" | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsSearch, setSuggestionsSearch] = useState("");
  const [viewingVersion, setViewingVersion] = useState(1);
  const [compareOpen, setCompareOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const rev = await getReview(reviewId);
      const proj = await getProject(rev.projectId);
      const comms = await getComments(reviewId);
      
      setReview(rev);
      setProject(proj);
      setComments(comms);
      setViewingVersion(getCurrentVersionNumber(rev));

      // Verify client email address
      const storedEmail = localStorage.getItem("reviewerEmail");
      const isAllowed = 
        storedEmail && 
        (storedEmail.toLowerCase() === proj.clientEmail.toLowerCase() || 
         proj.invitedEmails?.some((e) => e.toLowerCase() === storedEmail.toLowerCase()));

      if (isAllowed) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        if (storedEmail) {
          localStorage.removeItem("reviewerEmail");
          localStorage.removeItem("reviewerName");
        }
      }

      if (rev.status === "approved") {
        setIsApproved(true);
      } else if (rev.status === "revision") {
        setIsRevision(true);
      }
    } catch (error) {
      console.error("Error loading client review workspace:", error);
      toast.error("Failed to load review workspace.");
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    if (reviewId) fetchData();
  }, [reviewId, fetchData]);

  useEffect(() => {
    if (compareOpen) {
      setPendingAnnotation(null);
      setPinCommentText("");
    }
  }, [compareOpen]);

  // Video Playhead Timer Sync
  useEffect(() => {
    if (isVideoPlaying) {
      videoIntervalRef.current = setInterval(() => {
        setVideoTime((prev) => {
          if (prev >= videoDuration) {
            setIsVideoPlaying(false);
            return videoDuration;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    }

    return () => {
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    };
  }, [isVideoPlaying, videoDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Authorization Form Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !nameInput.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (!project) return;

    try {
      setIsSubmittingAuth(true);
      const email = emailInput.trim().toLowerCase();
      
      const isAllowed = 
        email === project.clientEmail.toLowerCase() || 
        project.invitedEmails?.some((e) => e.toLowerCase() === email);

      if (isAllowed) {
        localStorage.setItem("reviewerEmail", emailInput.trim());
        localStorage.setItem("reviewerName", nameInput.trim());
        setIsAuthorized(true);
        toast.success(`Welcome, ${nameInput.trim()}! ✅`);
      } else {
        toast.error("Access Denied: Your email is not invited to this review project.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Authorization failed.");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Autocomplete autocomplete helpers
  const getProjectMembers = useCallback(() => {
    if (!project) return [];
    const members = [
      { name: "Agency", email: "workspace@signoff.ai" },
      { name: project.clientName, email: project.clientEmail },
      ...(project.invitedEmails || []).map((email) => {
        const prefix = email.split("@")[0];
        const dispName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
        return { name: dispName, email };
      }),
    ];
    return members;
  }, [project]);

  const handleInputChange = (text: string, type: "pin" | "video" | "general") => {
    if (type === "pin") setPinCommentText(text);
    else if (type === "video") setVideoCommentText(text);
    else setOverallNote(text);

    const plainText = type === "pin" ? htmlToPlainText(text) : text;
    const words = plainText.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.startsWith("@")) {
      setActiveInputType(type);
      setShowSuggestions(true);
      setSuggestionsSearch(lastWord.slice(1));
    } else {
      setShowSuggestions(false);
      setActiveInputType(null);
    }
  };

  const selectSuggestion = (email: string) => {
    let currentText = "";
    if (activeInputType === "pin") currentText = htmlToPlainText(pinCommentText);
    else if (activeInputType === "video") currentText = videoCommentText;
    else currentText = overallNote;

    const lastAtIndex = currentText.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const newPlain = currentText.slice(0, lastAtIndex) + `@${email} `;
      if (activeInputType === "pin") setPinCommentText(`<p>${newPlain}</p>`);
      else if (activeInputType === "video") setVideoCommentText(newPlain);
      else setOverallNote(newPlain);
    }

    setShowSuggestions(false);
    setActiveInputType(null);
  };

  // Save client image annotation comment
  const handlePinCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAnnotation || isCommentEmpty(pinCommentText)) return;

    const email = localStorage.getItem("reviewerEmail") || "client@example.com";
    const name = localStorage.getItem("reviewerName") || "Client";

    try {
      setIsCommentSubmitting(true);
      const activeAnnotations = comments.filter((c) => c.type === "annotation");
      const nextPinNumber = activeAnnotations.length + 1;

      await createComment({
        reviewId,
        text: pinCommentText,
        type: "annotation",
        annotationKind: pendingAnnotation.kind,
        xPercent: pendingAnnotation.x,
        yPercent: pendingAnnotation.y,
        widthPercent: pendingAnnotation.width,
        heightPercent: pendingAnnotation.height,
        endXPercent: pendingAnnotation.endX,
        endYPercent: pendingAnnotation.endY,
        resolved: false,
        author: "client",
        authorEmail: email,
        authorName: name,
        pinNumber: nextPinNumber,
        versionNumber: viewingVersion,
      });

      toast.success("Comment saved");
      setPinCommentText("");
      setPendingAnnotation(null);
      
      const updatedComms = await getComments(reviewId);
      setComments(updatedComms);
    } catch (error) {
      console.error("Error creating pin comment:", error);
      toast.error("Failed to post comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // Save client video timestamp comment
  const handleVideoCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoCommentText.trim()) return;

    const email = localStorage.getItem("reviewerEmail") || "client@example.com";
    const name = localStorage.getItem("reviewerName") || "Client";

    try {
      setIsCommentSubmitting(true);
      await createComment({
        reviewId,
        text: videoCommentText,
        type: "annotation",
        timestamp: videoTime,
        timestampLabel: formatTime(videoTime),
        resolved: false,
        author: "client",
        authorEmail: email,
        authorName: name,
      });

      toast.success("Comment saved");
      setVideoCommentText("");
      setIsVideoPlaying(false);
      
      const updatedComms = await getComments(reviewId);
      setComments(updatedComms);
    } catch (error) {
      console.error("Error creating video comment:", error);
      toast.error("Failed to post comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // Action Bar Approvals Click handlers
  const handleLooksGood = async () => {
    if (!review) return;
    try {
      setIsActionSubmitting(true);
      
      if (overallNote.trim()) {
        const email = localStorage.getItem("reviewerEmail") || "client@example.com";
        const name = localStorage.getItem("reviewerName") || "Client";
        await createComment({
          reviewId,
          text: overallNote,
          type: "general",
          resolved: false,
          author: "client",
          authorEmail: email,
          authorName: name,
        });
        setOverallNote("");
      }

      await updateReview(reviewId, { status: "approved" });
      setIsApproved(true);
      setViewAnyway(false);
      toast.success("Approved ✅");
    } catch (error) {
      console.error("Error approving review:", error);
      toast.error("Failed to record approval.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  const handleNeedEdit = async () => {
    if (!review) return;

    const clientComments = comments.filter((c) => c.author === "client" && c.authorEmail?.toLowerCase() === localStorage.getItem("reviewerEmail")?.toLowerCase());
    const hasClientFeedback = overallNote.trim().length > 0 || clientComments.length > 0;

    if (!hasClientFeedback) {
      toast.error("Feedback required: please type an overall note or leave a comment pin on the file.");
      return;
    }

    try {
      setIsActionSubmitting(true);
      
      if (overallNote.trim()) {
        const email = localStorage.getItem("reviewerEmail") || "client@example.com";
        const name = localStorage.getItem("reviewerName") || "Client";
        await createComment({
          reviewId,
          text: overallNote,
          type: "general",
          resolved: false,
          author: "client",
          authorEmail: email,
          authorName: name,
        });
        setOverallNote("");
      }

      await updateReview(reviewId, { status: "revision" });
      setIsRevision(true);
      setViewAnyway(false);
      toast.success("Revision requested 🔁");
    } catch (error) {
      console.error("Error requesting revision:", error);
      toast.error("Failed to save changes request.");
    } finally {
      setIsActionSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50/50">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-sm font-semibold text-muted-foreground mt-3">Loading review workspace...</span>
      </div>
    );
  }

  // RENDER EMAIL LOGIN MODAL
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex flex-col justify-center items-center p-6 font-sans">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
              Enter Review Workspace
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Please verify your identity to access this creative review asset.
            </p>
          </div>

          <Card className="border border-border bg-white rounded-xl shadow-md p-6">
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="authName">Full Name</Label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="authName"
                    type="text"
                    placeholder="e.g., Jane Cooper"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    className="pl-10 h-11 border-border rounded-lg bg-zinc-50/30 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="authEmail">Email Address</Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="authEmail"
                    type="email"
                    placeholder="e.g., jane@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    required
                    className="pl-10 h-11 border-border rounded-lg bg-zinc-50/30 text-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-11 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm mt-2"
              >
                {isSubmittingAuth ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Verify Identity & Enter"
                )}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  // SUCCESS / FINAL STATE VIEWS (Bypassed if viewAnyway is true)
  if (isApproved && !viewAnyway) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              className="h-16 w-16 bg-success rounded-full flex items-center justify-center text-white shadow-lg"
            >
              <Check className="h-8 w-8 stroke-[3]" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-900">Approved!</h1>
            <p className="text-sm text-muted-foreground font-medium">
              Thanks! Your approval has been recorded.
            </p>
            <p className="text-xs text-muted-foreground">The team has been notified.</p>
          </div>
          <div className="pt-4 border-t border-border flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setViewAnyway(true);
              }}
              className="text-xs font-semibold rounded-md border-border"
            >
              View Asset
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (isRevision && !viewAnyway) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            <motion.div
              initial={{ rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="h-16 w-16 bg-danger rounded-full flex items-center justify-center text-white shadow-lg"
            >
              <RotateCcw className="h-8 w-8" />
            </motion.div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-zinc-900">Revision Requested</h1>
            <p className="text-sm text-muted-foreground font-medium">
              We&apos;ll get back to you shortly.
            </p>
            <p className="text-xs text-muted-foreground">Your feedback has been saved and shared with the team.</p>
          </div>
          <div className="pt-4 border-t border-border flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                setViewAnyway(true);
              }}
              className="text-xs font-semibold rounded-md border-border"
            >
              View Asset & Comments
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // SUGGESTION FILTER LIST
  const filteredSuggestions = getProjectMembers().filter((m) =>
    m.email.toLowerCase().includes(suggestionsSearch.toLowerCase()) ||
    m.name.toLowerCase().includes(suggestionsSearch.toLowerCase())
  );

  const versionScopedComments = comments.filter(
    (c) => c.versionNumber === undefined || c.versionNumber === viewingVersion
  );

  const displayImageSrc =
    review?.type === "image" ? getVersionAsset(review, viewingVersion) : undefined;

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col pb-36 text-zinc-900 font-sans">
      
      {/* Brand Header */}
      <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-white px-6 md:px-12 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-zinc-900">
            {project?.name || "Workspace Review"}
          </span>
          <span className="text-muted-foreground text-xs font-normal">| Client Link</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-2">
          <span>Reviewer:</span>
          <span className="font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded">
            {localStorage.getItem("reviewerEmail")}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-0 py-8 space-y-6">
        
        {/* Title row */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-zinc-950">{review?.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Review of media asset uploaded by the agency. Click coordinates or write comments. Use @ to tag.
            </p>
          </div>
          {viewAnyway && (
            <Button
              variant="outline"
              onClick={() => setViewAnyway(false)}
              className="text-xs font-semibold rounded-md border-border bg-white hover:bg-zinc-50"
            >
              Show Status Overlay
            </Button>
          )}
        </div>

        {/* Media Window Container */}
        <div className="border border-border rounded-lg bg-white shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border bg-zinc-50/50 flex flex-col gap-2 px-4">
            <div className="flex justify-between items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700 truncate">{review?.title}</span>
              <span className="text-[10px] bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded uppercase font-bold tracking-wider shrink-0">
                {review?.type}
              </span>
            </div>
            {review && (
              <VersionToolbar
                review={review}
                viewingVersion={viewingVersion}
                onViewingVersionChange={setViewingVersion}
                compareOpen={compareOpen}
                onCompareOpenChange={setCompareOpen}
                allowUpload={false}
                onReviewUpdated={(updated) => {
                  setReview(updated);
                  setViewingVersion(getCurrentVersionNumber(updated));
                }}
              />
            )}
          </div>

          {review?.type === "image" && compareOpen ? (
            <VersionComparePanel review={review} viewingVersion={viewingVersion} />
          ) : (
            <div className="p-1.5 bg-zinc-100 flex-1 flex items-center justify-center min-h-[350px] overflow-hidden">
              {review?.type === "video" ? (
                <div className="w-full h-full flex flex-col justify-center items-center aspect-video relative max-w-3xl mx-auto rounded overflow-hidden shadow">
                  <iframe
                    src={review.url}
                    frameBorder="0"
                    allowFullScreen
                    className="w-full h-full pointer-events-auto"
                  />
                </div>
              ) : displayImageSrc ? (
                <ImageAnnotationCanvas
                  imageSrc={displayImageSrc}
                  imageAlt={review?.title || "Review asset"}
                  comments={versionScopedComments}
                  tool={annotationTool}
                  onToolChange={setAnnotationTool}
                  pending={pendingAnnotation}
                  onPendingChange={setPendingAnnotation}
                  hoveredPinId={hoveredPinId}
                  onHoveredPinIdChange={setHoveredPinId}
                />
              ) : null}
            </div>
          )}
        </div>

        {review?.type === "image" && !compareOpen && pendingAnnotation && (
          <PinCommentDock
            annotation={pendingAnnotation}
            value={pinCommentText}
            onChange={(v) => handleInputChange(v, "pin")}
            onCancel={() => {
              setPendingAnnotation(null);
              setPinCommentText("");
            }}
            onSubmit={() => handlePinCommentSubmit({ preventDefault: () => {} } as React.FormEvent)}
            isSubmitting={isCommentSubmitting}
            suggestions={
              showSuggestions && activeInputType === "pin" && filteredSuggestions.length > 0 ? (
                <div className="mt-1 w-full bg-white border border-border rounded-md shadow-lg z-30 max-h-36 overflow-y-auto divide-y divide-zinc-100">
                  {filteredSuggestions.map((m) => (
                    <button
                      key={m.email}
                      type="button"
                      onClick={() => selectSuggestion(m.email)}
                      className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-zinc-50 flex flex-col"
                    >
                      <span className="font-bold text-zinc-800">{m.name}</span>
                      <span className="text-muted-foreground">{m.email}</span>
                    </button>
                  ))}
                </div>
              ) : null
            }
          />
        )}

        {/* Video comment boxes */}
        {review?.type === "video" && (
          <div className="border border-border rounded-lg bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs font-semibold text-zinc-700">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-500" /> Video Timer Sync
                </span>
                <span className="font-mono text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
                  {formatTime(videoTime)} / {formatTime(videoDuration)}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md flex-shrink-0 transition"
                >
                  {isVideoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={videoDuration}
                  value={videoTime}
                  onChange={(e) => {
                    setVideoTime(parseInt(e.target.value));
                    setIsVideoPlaying(false);
                  }}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>

            <form onSubmit={handleVideoCommentSubmit} className="space-y-3 pt-3 border-t border-border relative">
              <Label htmlFor="videoComment" className="text-xs font-bold text-zinc-800">
                Add Feedback Note at <span className="text-indigo-500">[{formatTime(videoTime)}]</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    id="videoComment"
                    placeholder="e.g., Audio feels too loud... use @ to tag"
                    value={videoCommentText}
                    onChange={(e) => handleInputChange(e.target.value, "video")}
                    required
                    className="w-full border-border rounded-md"
                  />

                  {/* Autocomplete Dropdown overlay */}
                  {showSuggestions && activeInputType === "video" && filteredSuggestions.length > 0 && (
                    <div className="absolute left-0 bottom-full mb-1 w-full bg-white border border-border rounded-md shadow-lg z-30 max-h-36 overflow-y-auto divide-y divide-zinc-100">
                      {filteredSuggestions.map((m) => (
                        <button
                          key={m.email}
                          type="button"
                          onClick={() => selectSuggestion(m.email)}
                          className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-zinc-50 flex flex-col"
                        >
                          <span className="font-bold text-zinc-800">{m.name}</span>
                          <span className="text-muted-foreground">{m.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={isCommentSubmitting || !videoCommentText.trim()}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-md"
                >
                  {isCommentSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comment"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {review?.type === "image" && !compareOpen && !pendingAnnotation && (
          <div className="flex items-center gap-2 p-4 border border-dashed border-border bg-white rounded-lg text-xs text-muted-foreground justify-center">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            <span>Choose Pin, Snip, or Arrow above the image, then click or drag on the image to annotate.</span>
          </div>
        )}

        {/* Existing Comments Feed */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-zinc-800 uppercase tracking-wide">All Comments Feed</h2>
          
          <div className="border border-border bg-white rounded-lg shadow-sm divide-y divide-border overflow-hidden">
            {comments.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted-foreground">
                No comments left on this media file.
              </div>
            ) : (
              comments.map((comment) => {
                const isAnnotation = comment.type === "annotation";
                const isClient = comment.author === "client";
                const pinNum = comment.pinNumber || 
                  (comments.filter((c) => c.type === "annotation").findIndex((c) => c.id === comment.id) + 1);
                
                const authorDisplayName = comment.authorName || (isClient ? "Client" : "Agency");

                return (
                  <div key={comment.id} className="p-4 flex gap-3 text-xs">
                    {/* Badge */}
                    {isAnnotation && (
                      <div className="flex-shrink-0">
                        {comment.xPercent !== undefined ? (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${comment.resolved ? "bg-zinc-300 text-zinc-600" : "bg-indigo-500 text-white"}`}>
                            {pinNum}
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded font-mono cursor-pointer hover:bg-indigo-100"
                            onClick={() => comment.timestamp !== undefined && setVideoTime(comment.timestamp)}
                          >
                            <Clock className="h-2.5 w-2.5" /> {comment.timestampLabel}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${isClient ? "bg-indigo-50 text-indigo-700" : "bg-zinc-100 text-zinc-700"}`}>
                          {authorDisplayName} {comment.authorEmail ? `(${comment.authorEmail})` : ""}
                        </span>
                        {comment.resolved && (
                          <span className="text-[10px] text-zinc-500 font-semibold italic">Resolved</span>
                        )}
                      </div>
                      <div className={`leading-relaxed ${comment.resolved ? "line-through opacity-60" : ""}`}>
                        <CommentBody text={comment.text} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </main>

      {/* Sticky Bottom Client Action Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white p-4 shadow-xl z-20 flex justify-center">
        <div className="w-full max-w-3xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:flex-1 relative">
            <Input
              placeholder="Add an overall final note... use @ to tag"
              value={overallNote}
              onChange={(e) => handleInputChange(e.target.value, "general")}
              className="border-border rounded-md text-xs w-full h-10"
            />

            {/* Autocomplete Dropdown overlay */}
            {showSuggestions && activeInputType === "general" && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 bottom-full mb-2 w-full bg-white border border-border rounded-md shadow-lg z-30 max-h-36 overflow-y-auto divide-y divide-zinc-100">
                {filteredSuggestions.map((m) => (
                  <button
                    key={m.email}
                    type="button"
                    onClick={() => selectSuggestion(m.email)}
                    className="w-full text-left px-3 py-1.5 text-[10px] hover:bg-zinc-50 flex flex-col"
                  >
                    <span className="font-bold text-zinc-800">{m.name}</span>
                    <span className="text-muted-foreground">{m.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <Button
              onClick={handleLooksGood}
              disabled={isActionSubmitting}
              className="flex-1 md:flex-initial bg-success hover:bg-success/90 text-white border-0 font-semibold text-xs h-10 px-5 rounded-md flex items-center justify-center gap-1.5"
            >
              <Check className="h-4 w-4 stroke-[3]" /> Looks Good
            </Button>
            <Button
              onClick={handleNeedEdit}
              disabled={isActionSubmitting}
              className="flex-1 md:flex-initial bg-danger hover:bg-danger/90 text-white border-0 font-semibold text-xs h-10 px-5 rounded-md flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="h-4 w-4" /> Need Edit
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
}
