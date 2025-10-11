"use client";

import { useState, useTransition } from "react";

type Props = {
  submissionId: string;
  action: (submissionId: string) => Promise<void>;
  variant?: "approved" | "rejected";
};

const prompts = {
  approved: {
    title: "Remove this published story?",
    body: "This will yank it off the community map forever.",
    confirm: "Yes, launch it",
    cancel: "No, keep it",
  },
  rejected: {
    title: "Discard this submission?",
    body: "It will be gone for good (no take-backs).",
    confirm: "Yes, clean it up",
    cancel: "No, leave it",
  },
};

export function DeleteSubmissionButton({ submissionId, action, variant = "rejected" }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const prompt = prompts[variant];

  const handleConfirm = () => {
    startTransition(async () => {
      await action(submissionId);
      setConfirming(false);
    });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="text-xs font-semibold text-red-600 underline hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() => setConfirming(true)}
        disabled={isPending}
      >
        Delete permanently
      </button>

      {confirming && (
        <div className="absolute right-0 z-40 mt-2 w-60 rounded-lg border border-red-200 bg-white shadow-lg">
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-red-700">{prompt.title}</div>
            <p className="mt-1 text-xs text-slate-600">{prompt.body}</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-red-100 px-3 py-2">
            <button
              type="button"
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              {prompt.cancel}
            </button>
            <button
              type="button"
              className="rounded bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {prompt.confirm}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
