"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createQuoteAction,
  updateQuoteAction,
  updateQuoteStatusAction,
  deleteQuoteAction,
  duplicateQuoteAction,
  convertQuoteToContractAction,
} from "@/actions/finance/actions";
import type { CreateQuoteInput, UpdateQuoteInput } from "@/lib/validations/finance";
import type { QuoteStatus } from "@/lib/finance/utils";

export function useQuoteMutations(slug: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["quotes", slug] });
  };

  const createQuote = useMutation({
    mutationFn: (input: CreateQuoteInput) => createQuoteAction(slug, input),
    onSuccess: invalidate,
  });

  const updateQuote = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateQuoteInput }) =>
      updateQuoteAction(slug, id, input),
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      updateQuoteStatusAction(slug, id, status),
    onSuccess: invalidate,
  });

  const removeQuote = useMutation({
    mutationFn: (id: string) => deleteQuoteAction(slug, id),
    onSuccess: invalidate,
  });

  const duplicateQuote = useMutation({
    mutationFn: (id: string) => duplicateQuoteAction(slug, id),
    onSuccess: invalidate,
  });

  const convertToContract = useMutation({
    mutationFn: (id: string) => convertQuoteToContractAction(slug, id),
    onSuccess: invalidate,
  });

  return {
    createQuote,
    updateQuote,
    updateStatus,
    removeQuote,
    duplicateQuote,
    convertToContract,
  };
}
