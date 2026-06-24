"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Monitor, CheckCircle2, ArrowRight, ArrowLeft, Globe } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProject } from "@/lib/api";

interface CreateProjectModalProps {
  onProjectCreated?: () => void;
}

export function CreateProjectModal({ onProjectCreated }: CreateProjectModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [extensionDetected, setExtensionDetected] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    // Check for extension detection
    const checkExtension = () => {
      const detected = document.documentElement.getAttribute('data-signoffai') === 'true';
      if (detected) {
        setExtensionDetected(true);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SIGNOFFAI_EXTENSION_PRESENT') {
        setExtensionDetected(true);
      }
    };

    if (step === 2) {
      checkExtension();
      const interval = setInterval(checkExtension, 2000);
      window.addEventListener('message', handleMessage);
      return () => {
        clearInterval(interval);
        window.removeEventListener('message', handleMessage);
      };
    }
  }, [step]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    
    // Simple URL validation
    try {
      new URL(url);
    } catch (e) {
      toast.error("Please enter a valid URL including http:// or https://");
      return;
    }

    setStep(2);
  };

  const handleCreateProject = async () => {
    try {
      setIsCreating(true);
      const project = await createProject({
        name,
        url,
        version: "1.0.0"
      });
      
      toast.success("Project created ✅");
      setOpen(false);
      resetForm();
      if (onProjectCreated) onProjectCreated();
      router.push(`/projects/${project._id || project.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setName("");
    setUrl("");
    setExtensionDetected(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) resetForm();
    }}>
      <DialogTrigger
        render={
          <Button className="w-full bg-zinc-900 hover:bg-zinc-800 text-white rounded-md flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[560px] bg-white rounded-[16px] p-8 border-none shadow-2xl">
        {/* Progress Indicator */}
        <div className="flex flex-col items-center mb-8">
           <div className="flex items-center gap-2 mb-2">
             <div className={`h-2.5 w-2.5 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-zinc-200'}`} />
             <div className={`h-1 w-12 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-zinc-200'}`} />
             <div className={`h-2.5 w-2.5 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-zinc-200'}`} />
           </div>
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Step {step} of 2</span>
        </div>

        {step === 1 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <DialogHeader className="mb-8 text-center">
              <DialogTitle className="text-2xl font-bold text-zinc-900">Create New Project</DialogTitle>
              <DialogDescription className="text-zinc-500">
                Set up your project in 2 simple steps
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleContinue} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="projectName" className="text-sm font-bold text-zinc-700">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="e.g. Skysecure Shop UAT"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 border-zinc-200 rounded-xl focus:ring-indigo-500"
                  required
                  minLength={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectUrl" className="text-sm font-bold text-zinc-700">Project URL *</Label>
                <Input
                  id="projectUrl"
                  placeholder="https://shop.skysecure.ai"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-12 border-zinc-200 rounded-xl focus:ring-indigo-500"
                  required
                />
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                  This is the base URL of the application you want to review. The extension will activate automatically on this domain.
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={!name || !url || name.length < 3}
                className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl mt-4 flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={18} />
              </Button>
            </form>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <DialogHeader className="mb-8 text-center">
              <DialogTitle className="text-2xl font-bold text-zinc-900">Install the Chrome Extension</DialogTitle>
              <DialogDescription className="text-zinc-500">
                The extension connects your browser to this project
              </DialogDescription>
            </DialogHeader>

            <div className="bg-zinc-50 rounded-2xl p-8 border border-zinc-100 flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-zinc-100">
                 <Globe className="text-indigo-500" size={32} />
              </div>
              <h4 className="font-bold text-zinc-900 mb-1">Signoff.AI for Chrome</h4>
              <p className="text-sm text-zinc-500 mb-6">Review live apps directly from your browser</p>
              
              <div className="flex flex-col gap-3 w-full">
                <Button 
                  variant="outline"
                  onClick={() => window.open('chrome://extensions', '_blank')}
                  className="bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50 rounded-xl px-6 h-11 font-bold flex items-center gap-2"
                >
                  <Globe size={18} /> Load in Developer Mode
                </Button>
                <p className="text-[10px] text-zinc-400">
                  Open <strong>chrome://extensions</strong>, enable <strong>Developer mode</strong>, and click <strong>Load unpacked</strong> to select your extension folder.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center mb-8">
              {extensionDetected ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold animate-in zoom-in duration-300">
                   <CheckCircle2 size={20} />
                   <span>Extension detected! You're ready to go.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-zinc-400 font-medium">
                   <Loader2 size={18} className="animate-spin" />
                   <span>Waiting for extension to be installed...</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <Button 
                variant="ghost" 
                onClick={() => setStep(1)}
                className="text-zinc-400 hover:text-zinc-900 font-bold flex items-center gap-2"
              >
                <ArrowLeft size={18} /> Back
              </Button>
              
              <div className="flex flex-col items-end gap-2">
                <Button 
                  onClick={handleCreateProject}
                  disabled={isCreating}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl px-8 h-12 flex items-center gap-2 shadow-lg shadow-indigo-200"
                >
                  {isCreating ? <Loader2 className="animate-spin" size={18} /> : "Go to Project"} <ArrowRight size={18} />
                </Button>
                <button 
                  onClick={handleCreateProject}
                  className="text-[11px] text-zinc-400 hover:text-zinc-600 font-bold underline"
                >
                  Already installed? Open your project →
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
