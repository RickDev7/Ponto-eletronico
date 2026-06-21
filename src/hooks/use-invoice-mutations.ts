"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createInvoiceAction,
  createPaymentAction,
  updateInvoiceStatusAction,
  duplicateInvoiceAction,
  deleteInvoiceAction,
  generateRecurringInvoicesAction,
  generateInvoiceFromContractAction,
} from "@/actions/finance/actions";
import type { CreateInvoiceInput, CreatePaymentInput } from "@/lib/validations/finance";
import type { InvoiceStatus } from "@/lib/finance/utils";

export function useInvoiceMutations(slug: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["invoices", slug] });

  return {
    createInvoice: useMutation({
      mutationFn: (input: CreateInvoiceInput) => createInvoiceAction(slug, input),
      onSuccess: invalidate,
    }),
    recordPayment: useMutation({
      mutationFn: (input: CreatePaymentInput) => createPaymentAction(slug, input),
      onSuccess: invalidate,
    }),
    updateStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
        updateInvoiceStatusAction(slug, id, status),
      onSuccess: invalidate,
    }),
    duplicate: useMutation({
      mutationFn: (id: string) => duplicateInvoiceAction(slug, id),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => deleteInvoiceAction(slug, id),
      onSuccess: invalidate,
    }),
    generateRecurring: useMutation({
      mutationFn: () => generateRecurringInvoicesAction(slug),
      onSuccess: invalidate,
    }),
    generateFromContract: useMutation({
      mutationFn: ({
        contractId,
        mode,
      }: {
        contractId: string;
        mode?: "recurring" | "one_time";
      }) => generateInvoiceFromContractAction(slug, contractId, mode),
      onSuccess: invalidate,
    }),
  };
}
