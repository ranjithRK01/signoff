"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Search, ArrowRight, Loader2, FolderKanban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Project, Review } from "@/lib/api";

export default function ClientPortalPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setIsLoading(true);
      setHasSearched(true);

      // Fetch projects matching clientEmail
      const projRes = await fetch(`http://localhost:3001/projects?clientEmail=${encodeURIComponent(email.trim())}`);
      const matchedProjects: Project[] = projRes.ok ? await projRes.json() : [];

      if (matchedProjects.length > 0) {
        // Fetch all reviews
        const revRes = await fetch("http://localhost:3001/reviews");
        const allReviews: Review[] = revRes.ok ? await revRes.json() : [];

        // Filter reviews that belong to matched projects
        const projectIds = matchedProjects.map((p) => p.id);
        const filteredReviews = allReviews.filter((r) => projectIds.includes(r.projectId));

        setProjects(matchedProjects);
        setReviews(filteredReviews);
      } else {
        setProjects([]);
        setReviews([]);
      }
    } catch (error) {
      console.error("Error searching client reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 flex flex-col justify-center items-center p-6 font-sans">
      <div className="max-w-2xl w-full space-y-8">
        
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold text-xl shadow-lg shadow-indigo-200">
            S
          </div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            signoff<span className="text-indigo-600">.ai</span> Client Portal
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enter your email address to access all creative reviews, approvals, and shared assets.
          </p>
        </div>

        {/* Search Card */}
        <Card className="border border-border bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-bold text-zinc-800 uppercase tracking-wide">
                Your Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 border-border rounded-lg bg-zinc-50/30"
                />
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg h-11 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Find My Reviews
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Results Panel */}
        <AnimatePresence mode="wait">
          {hasSearched && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {projects.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border bg-white rounded-xl p-8 shadow-sm">
                  <FolderKanban className="h-10 w-10 text-muted-foreground/60 mx-auto mb-4 stroke-[1.5]" />
                  <p className="text-sm font-semibold text-zinc-800">No reviews found</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    We couldn&apos;t find any active projects associated with <span className="font-semibold text-zinc-700">{email}</span>.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <h2 className="text-xs font-bold text-zinc-700 uppercase tracking-wider pl-1">
                    Projects & Active Reviews
                  </h2>
                  
                  {projects.map((project) => {
                    const projectReviews = reviews.filter((r) => r.projectId === project.id);
                    
                    return (
                      <Card key={project.id} className="border border-border bg-white rounded-xl shadow-sm overflow-hidden">
                        <CardHeader className="bg-zinc-50/50 border-b border-border py-4 px-6">
                          <CardTitle className="text-base font-bold text-zinc-900">
                            {project.name}
                          </CardTitle>
                          <CardDescription className="text-xs text-muted-foreground">
                            Created {new Date(project.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 divide-y divide-border">
                          {projectReviews.length === 0 ? (
                            <div className="p-6 text-center text-xs text-muted-foreground">
                              No review items have been added to this project yet.
                            </div>
                          ) : (
                            projectReviews.map((review) => (
                              <div
                                key={review.id}
                                className="flex items-center justify-between p-4 px-6 hover:bg-zinc-50/30 transition-colors"
                              >
                                <div className="space-y-1 min-w-0 pr-4">
                                  <h4 className="text-sm font-semibold text-zinc-900 truncate">
                                    {review.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                    <span className="uppercase font-bold tracking-wider text-indigo-500">
                                      {review.type}
                                    </span>
                                    <span>•</span>
                                    <span>Uploaded {new Date(review.createdAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4 flex-shrink-0">
                                  <StatusBadge status={review.status} />
                                  <Link href={`/review/${review.id}`}>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 border-border text-xs rounded-md font-semibold text-zinc-800 hover:bg-zinc-50 flex items-center gap-1 bg-white"
                                    >
                                      Open <ArrowRight className="h-3.5 w-3.5" />
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
