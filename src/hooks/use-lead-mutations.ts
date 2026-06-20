"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createLeadAction,
  updateLeadAction,
  updateLeadStatusAction,
  deleteLeadAction,
  createLeadContactAction,
} from "@/actions/crm/actions";
import type { CreateLeadInput, CreateLeadContactInput, LeadStatus } from "@/lib/validations/crm";

export function useLeadMutations(slug: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leads", slug] });
    queryClient.invalidateQueries({ queryKey: ["crm", slug] });
  };

  return {
    createLead: useMutation({
      mutationFn: (input: CreateLeadInput) => createLeadAction(slug, input),
      onSuccess: invalidate,
    }),
    updateLead: useMutation({
      mutationFn: ({ id, input }: { id: string; input: CreateLeadInput }) =>
        updateLeadAction(slug, id, input),
      onSuccess: invalidate,
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: LeadStatus }) =>
        updateLeadStatusAction(slug, id, status),
      onSuccess: invalidate,
    }),
    removeLead: useMutation({
      mutationFn: (id: string) => deleteLeadAction(slug, id),
      onSuccess: invalidate,
    }),
    createContact: useMutation({
      mutationFn: (input: CreateLeadContactInput) => createLeadContactAction(slug, input),
      onSuccess: invalidate,
    }),
  };
}
