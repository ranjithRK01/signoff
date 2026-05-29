"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Play, Pause, Check, MessageSquare, X, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

import { getProject, getReview, getComments, createComment, updateComment, updateReview, Project, Review, Comment } from "@/lib/api";
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

export default function ReviewPage() {
  const { id: projectId, reviewId } = useParams() as { id: string; reviewId: string };
  
  const [project, setProject] = useState<Project | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [isStatusSubmitting, setIsStatusSubmitting] = useState(false);

  // Layout states
  const [showResolved, setShowResolved] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  // New Comment form states
  const [generalCommentText, setGeneralCommentText] = useState("");
  
  // Image annotation state
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("pin");
  const [pendingAnnotation, setPendingAnnotation] = useState<PendingAnnotation | null>(null);
  const [pinCommentText, setPinCommentText] = useState("");

  // Video Mock Playhead State
  const [videoDuration] = useState(180); // 3 minutes mock length
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
    } catch (error) {
      console.error("Error fetching review workspace:", error);
      toast.error("Failed to load workspace files.");
    } finally {
      setIsLoading(false);
    }
  }, [reviewId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (compareOpen) {
      setPendingAnnotation(null);
      setPinCommentText("");
    }
  }, [compareOpen]);

  // Video mock playback timer
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

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Autocomplete helpers
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
    else setGeneralCommentText(text);

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
    else currentText = generalCommentText;

    const lastAtIndex = currentText.lastIndexOf("@");
    if (lastAtIndex !== -1) {
      const newPlain = currentText.slice(0, lastAtIndex) + `@${email} `;
      if (activeInputType === "pin") setPinCommentText(`<p>${newPlain}</p>`);
      else if (activeInputType === "video") setVideoCommentText(newPlain);
      else setGeneralCommentText(newPlain);
    }

    setShowSuggestions(false);
    setActiveInputType(null);
  };

  // Submit Image Annotation Comment
  const handlePinCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAnnotation || isCommentEmpty(pinCommentText)) return;

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
        author: "agency",
        pinNumber: nextPinNumber,
        versionNumber: viewingVersion,
      });

      toast.success("Comment saved");
      setPinCommentText("");
      setPendingAnnotation(null);
      
      // Refresh comments
      const updatedComms = await getComments(reviewId);
      setComments(updatedComms);
    } catch (error) {
      console.error("Error creating pin comment:", error);
      toast.error("Failed to post comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // Submit Video Timestamp Comment
  const handleVideoCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoCommentText.trim()) return;

    try {
      setIsCommentSubmitting(true);
      await createComment({
        reviewId,
        text: videoCommentText,
        type: "annotation",
        timestamp: videoTime,
        timestampLabel: formatTime(videoTime),
        resolved: false,
        author: "agency",
      });

      toast.success("Comment saved");
      setVideoCommentText("");
      setIsVideoPlaying(false);
      
      // Refresh comments
      const updatedComms = await getComments(reviewId);
      setComments(updatedComms);
    } catch (error) {
      console.error("Error creating video comment:", error);
      toast.error("Failed to post comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // Submit General Sidebar Comment
  const handleGeneralCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalCommentText.trim()) return;

    try {
      setIsCommentSubmitting(true);
      await createComment({
        reviewId,
        text: generalCommentText,
        type: "general",
        resolved: false,
        author: "agency",
      });

      toast.success("Comment saved");
      setGeneralCommentText("");
      
      // Refresh comments
      const updatedComms = await getComments(reviewId);
      setComments(updatedComms);
    } catch (error) {
      console.error("Error creating general comment:", error);
      toast.error("Failed to post comment.");
    } finally {
      setIsCommentSubmitting(false);
    }
  };

  // Resolve comment flow
  const handleResolveComment = async (commentId: string, currentStatus: boolean) => {
    try {
      await updateComment(commentId, { resolved: !currentStatus });
      toast.success(currentStatus ? "Comment unresolved" : "Comment resolved");
      
      // Refresh comments
      const updatedComms = await getComments(reviewId);
      setComments(updatedComms);
    } catch (error) {
      console.error("Error updating comment status:", error);
      toast.error("Failed to update comment.");
    }
  };

  // Update Review Status Approval Flow
  const handleUpdateStatus = async (newStatus: "approved" | "revision") => {
    if (!review) return;
    try {
      setIsStatusSubmitting(true);
      await updateReview(reviewId, { status: newStatus });
      
      if (newStatus === "approved") {
        toast.success("Approved ✅");
      } else {
        toast.success("Revision requested 🔁");
      }
      
      // Refresh review
      const updatedReview = await getReview(reviewId);
      setReview(updatedReview);
    } catch (error) {
      console.error("Error updating review status:", error);
      toast.error("Failed to update status.");
    } finally {
      setIsStatusSubmitting(false);
    }
  };

  const versionScopedComments = comments.filter(
    (c) => c.versionNumber === undefined || c.versionNumber === viewingVersion
  );

  // Filter active and resolved comments
  const activeComments = versionScopedComments.filter((c) => !c.resolved);
  const resolvedComments = versionScopedComments.filter((c) => c.resolved);

  const displayImageSrc =
    review?.type === "image" ? getVersionAsset(review, viewingVersion) : undefined;

  // Suggestions search list
  const filteredSuggestions = getProjectMembers().filter((m) =>
    m.email.toLowerCase().includes(suggestionsSearch.toLowerCase()) ||
    m.name.toLowerCase().includes(suggestionsSearch.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col h-[100dvh] overflow-hidden bg-background"
    >
      <header className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border bg-white z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-zinc-900 transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Project
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block" />
          {review && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-zinc-900 truncate">{review.title}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shrink-0">
                {review.type}
              </span>
              <StatusBadge status={review.status} />
            </div>
          )}
        </div>

        {review && !isLoading && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => handleUpdateStatus("approved")}
              disabled={isStatusSubmitting}
              className="bg-success hover:bg-success/90 text-white border-0 h-9 px-4 text-xs rounded-md font-medium shadow-sm"
            >
              <Check className="h-3.5 w-3.5 mr-1.5" /> Approve
            </Button>
            <Button
              onClick={() => handleUpdateStatus("revision")}
              disabled={isStatusSubmitting}
              className="bg-danger hover:bg-danger/90 text-white border-0 h-9 px-4 text-xs rounded-md font-medium shadow-sm"
            >
              <X className="h-3.5 w-3.5 mr-1.5" /> Request Edit
            </Button>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex flex-1 min-h-0 gap-0 animate-pulse">
          <div className="flex-1 p-4">
            <div className="h-full min-h-[300px] rounded-lg bg-zinc-100 border border-border" />
          </div>
          <div className="w-full max-w-[380px] border-l border-border p-4 space-y-3 hidden lg:block">
            <div className="h-8 bg-zinc-200 rounded" />
            <div className="h-24 bg-zinc-100 rounded" />
            <div className="h-24 bg-zinc-100 rounded" />
          </div>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 overflow-hidden flex-col lg:flex-row">
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-3 md:p-4 gap-3">
            <div className="border border-border rounded-lg bg-white shadow-sm flex flex-col overflow-hidden flex-1 min-h-0">
              <div className="p-3 border-b border-border bg-zinc-50/50 flex flex-col gap-2 px-4">
                {review && (
                  <VersionToolbar
                    review={review}
                    viewingVersion={viewingVersion}
                    onViewingVersionChange={setViewingVersion}
                    compareOpen={compareOpen}
                    onCompareOpenChange={setCompareOpen}
                    onReviewUpdated={(updated) => {
                      setReview(updated);
                      setViewingVersion(getCurrentVersionNumber(updated));
                      setCompareOpen(false);
                    }}
                  />
                )}
              </div>

              {review?.type === "image" && compareOpen ? (
                <VersionComparePanel review={review} viewingVersion={viewingVersion} />
              ) : (
                <div className="p-1.5 bg-zinc-100 flex-1 flex items-center justify-center min-h-[280px] overflow-hidden">
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
                      immersive
                      onPinClick={(comment) => {
                        const pinNum =
                          comment.pinNumber ||
                          versionScopedComments.filter((c) => c.type === "annotation").findIndex((c) => c.id === comment.id) + 1;
                        toast.info(`Pin #${pinNum}: ${htmlToPlainText(comment.text)}`);
                      }}
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

            {/* Content Details Inputs Below Asset (Specific comments widgets) */}
            {review?.type === "video" && (
              <div className="border border-border rounded-lg bg-white p-6 shadow-sm space-y-4">
                {/* Mock Timer Scrub Controls */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-xs font-semibold text-zinc-700">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-indigo-500" /> Virtual Video Sync
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

                {/* Form to submit timestamp comment */}
                <form onSubmit={handleVideoCommentSubmit} className="space-y-3 pt-3 border-t border-border">
                  <Label htmlFor="videoComment" className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                    Add Comment at Timestamp <span className="text-indigo-500">[{formatTime(videoTime)}]</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        id="videoComment"
                        placeholder="e.g., Change font size... use @ to tag"
                        value={videoCommentText}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(e.target.value, "video")}
                        required
                        className="w-full border-border rounded-md"
                      />

                      {/* Autocomplete suggestions dropdown overlay */}
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
              <p className="text-[10px] text-muted-foreground text-center px-2">
                Pin, Snip, or Arrow — then click or drag on the image. Upload v2 and use Compare when ready.
              </p>
            )}
          </div>

          <aside className="w-full lg:w-[380px] shrink-0 flex flex-col min-h-0 border-t lg:border-t-0 lg:border-l border-border bg-zinc-50/30">
            <Card className="border-0 rounded-none shadow-none flex flex-col flex-1 min-h-0 h-full bg-white">
              <CardHeader className="p-4 border-b border-border bg-zinc-50/50 shrink-0">
                <h3 className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
                  Comments ({activeComments.length})
                </h3>
              </CardHeader>

              <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
                {comments.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-xs text-zinc-500">
                      No comments yet — {review?.type === "image" ? "annotate on the image." : "use the timestamp bar."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {activeComments.map((comment) => {
                      const isAnnotation = comment.type === "annotation";
                      const date = new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      // Calculate sequential pin number
                      const pinNum = comment.pinNumber || 
                        (comments.filter((c) => c.type === "annotation").findIndex((c) => c.id === comment.id) + 1);

                      const authorDisplayName = comment.authorName || (comment.author === "client" ? "Client" : "Agency");

                      return (
                        <div
                          key={comment.id}
                          onMouseEnter={() => setHoveredPinId(comment.id)}
                          onMouseLeave={() => setHoveredPinId(null)}
                          className="p-4 space-y-2 hover:bg-zinc-50/50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {/* Pin or Timestamp Indicator */}
                              {isAnnotation && (
                                <>
                                  {comment.xPercent !== undefined ? (
                                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                                      {pinNum}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer hover:bg-indigo-100" onClick={() => comment.timestamp !== undefined && setVideoTime(comment.timestamp)}>
                                      <Clock className="h-2.5 w-2.5" /> {comment.timestampLabel}
                                    </span>
                                  )}
                                </>
                              )}
                              
                              <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                {authorDisplayName} {comment.authorEmail ? `(${comment.authorEmail})` : ""}
                              </span>
                            </div>

                            <span className="text-[10px] text-zinc-500">{date}</span>
                          </div>

                          <div className="text-xs leading-relaxed text-zinc-800">
                            <CommentBody text={comment.text} />
                          </div>

                          <div className="flex justify-end pt-1">
                            <Button
                              onClick={() => handleResolveComment(comment.id, comment.resolved)}
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-1 flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> Resolve
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Resolved Comments Divider/Toggle */}
                    {resolvedComments.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowResolved(!showResolved)}
                          className="w-full py-2.5 px-4 flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-zinc-700 border-t border-b border-border bg-zinc-50"
                        >
                          <span>
                            {showResolved ? "Hide" : "Show"} resolved comments ({resolvedComments.length})
                          </span>
                          <span className="text-xs">{showResolved ? "▲" : "▼"}</span>
                        </button>
                        
                        {showResolved && (
                          <div className="divide-y divide-border/60 bg-zinc-50/20">
                            {resolvedComments.map((comment) => {
                              const isAnnotation = comment.type === "annotation";
                              const pinNum = comment.pinNumber || 
                                (comments.filter((c) => c.type === "annotation").findIndex((c) => c.id === comment.id) + 1);

                              const authorDisplayName = comment.authorName || (comment.author === "client" ? "Client" : "Agency");

                              return (
                                <div key={comment.id} className="p-4 space-y-2 opacity-60">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                      {isAnnotation && (
                                        <span className="w-5 h-5 rounded-full bg-zinc-300 text-zinc-600 flex items-center justify-center text-[10px] font-semibold">
                                          {comment.xPercent !== undefined ? pinNum : "✓"}
                                        </span>
                                      )}
                                      <span className="text-[9px] bg-zinc-100 text-zinc-500 px-1 py-0.5 rounded font-bold uppercase">
                                        {authorDisplayName} {comment.authorEmail ? `(${comment.authorEmail})` : ""}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-zinc-600 font-medium italic">Resolved</span>
                                  </div>
                                  <p className="text-xs text-zinc-500 line-through whitespace-pre-wrap">{comment.text}</p>
                                  <div className="flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleResolveComment(comment.id, comment.resolved)}
                                      className="text-[9px] font-semibold text-zinc-500 hover:text-zinc-800"
                                    >
                                      Unresolve
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>

              <div className="p-4 border-t border-border shrink-0 bg-zinc-50/50">
                <form onSubmit={handleGeneralCommentSubmit} className="space-y-3 relative">
                  <Label htmlFor="generalComment" className="text-[10px] font-bold text-zinc-800 uppercase tracking-wide">
                    Add General Comment
                  </Label>
                  <div className="relative">
                    <Textarea
                      id="generalComment"
                      placeholder="Feedback... use @ to tag"
                      rows={2}
                      value={generalCommentText}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange(e.target.value, "general")}
                      required
                      className="w-full border-border bg-white rounded-md text-xs resize-none"
                    />

                    {/* Autocomplete suggestions dropdown overlay */}
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
                  <Button
                    type="submit"
                    disabled={isCommentSubmitting || !generalCommentText.trim()}
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-md text-xs h-9"
                  >
                    {isCommentSubmitting ? "Submitting..." : "Send Comment"}
                  </Button>
                </form>
              </div>
            </Card>
          </aside>
        </div>
      )}
    </motion.div>
  );
}
