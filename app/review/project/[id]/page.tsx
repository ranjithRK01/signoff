"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mail, ArrowRight, Loader2, FolderKanban, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReviewSessionStatusBadge } from "@/components/mvp/review-status-badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getProject, getReviews, Project, ReviewSession } from "@/lib/api";

export default function ClientProjectDashboard() {
  const { id: projectId } = useParams() as { id: string };

  const [project, setProject] = useState<Project | null>(null);
  const [reviews, setReviews] = useState<ReviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Authorization Form States
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const checkAuthAndFetch = useCallback(async () => {
    try {
      setIsLoading(true);
      const proj = await getProject(projectId);
      setProject(proj);

      const storedEmail = localStorage.getItem("reviewerEmail");

      // Verify if email matches project permissions
      const isAllowed = 
        storedEmail && 
        (storedEmail.toLowerCase() === proj.clientEmail.toLowerCase() || 
         proj.invitedEmails?.some((e) => e.toLowerCase() === storedEmail.toLowerCase()));

      if (isAllowed) {
        setIsAuthorized(true);
        // Fetch project reviews
        const revs = await getReviews(projectId);
        setReviews(revs);
      } else {
        setIsAuthorized(false);
        // If they had an invalid email stored, clear it
        if (storedEmail) {
          localStorage.removeItem("reviewerEmail");
          localStorage.removeItem("reviewerName");
        }
      }
    } catch (error) {
      console.error("Error loading project dashboard:", error);
      toast.error("Failed to load project details.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      checkAuthAndFetch();
    }
  }, [projectId, checkAuthAndFetch]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

        // Fetch reviews
        const revs = await getReviews(projectId);
        setReviews(revs);
      } else {
        toast.error("Access Denied: Your email address is not invited to this review project.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Failed to authorize client portal.");
    } finally {
      setIsSubmittingAuth(false);
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
              Enter Project Workspace
            </h1>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Please verify your identity to access the reviews for <span className="font-semibold text-zinc-800">{project?.name}</span>.
            </p>
          </div>

          <Card className="border border-border bg-white rounded-xl shadow-md p-6">
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
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
                <Label htmlFor="email">Email Address</Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
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

  // RENDER AUTHORIZED PROJECT DASHBOARD
  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col font-sans">
      <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-border bg-white px-6 md:px-12 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm text-zinc-900">
            {project?.name}
          </span>
          <span className="text-muted-foreground text-xs font-normal">| Reviews Workspace</span>
        </div>
        <div className="text-[10px] text-muted-foreground font-semibold flex items-center gap-2">
          <span>Logged in as:</span>
          <span className="font-bold text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded">
            {localStorage.getItem("reviewerEmail")}
          </span>
          <button
            onClick={() => {
              localStorage.removeItem("reviewerEmail");
              localStorage.removeItem("reviewerName");
              setIsAuthorized(false);
              toast.info("Logged out successfully");
            }}
            className="text-[10px] text-indigo-600 hover:underline font-bold"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-950">{project?.name}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse through the files and review statuses below. Click on any item to view details, add comment pins, or leave feedback.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="max-w-md mx-auto pt-10 text-center py-12 border border-dashed border-border bg-white rounded-xl p-8 shadow-sm">
            <FolderKanban className="h-10 w-10 text-muted-foreground/60 mx-auto mb-4 stroke-[1.5]" />
            <p className="text-sm font-semibold text-zinc-800">No review files yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              The agency hasn&apos;t uploaded any review files for this project yet. Please check back later!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review) => {
              const uploadDate = new Date(review.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <Link href={`/review/${review.id}`} key={review.id}>
                  <Card className="hover:shadow-md transition-shadow duration-200 border border-border bg-white cursor-pointer group rounded-xl overflow-hidden">
                    <CardHeader className="pb-3 bg-zinc-50/50 border-b border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-500">
                          {review.reviewType}
                        </span>
                        <ReviewSessionStatusBadge status={review.status} />
                      </div>
                      <CardTitle className="text-base font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors mt-2">
                        {review.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Uploaded {uploadDate}</span>
                      <div className="flex items-center gap-1.5 text-indigo-600 font-semibold group-hover:translate-x-1 transition-transform">
                        Open Workspace <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
