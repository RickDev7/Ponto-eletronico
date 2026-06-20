"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createContractAction,
  updateContractAction,
  updateContractStatusAction,
  deleteContractAction,
  duplicateContractAction,
  generateRecurringInvoicesAction,
} from "@/actions/finance/actions";
import type { CreateContractInput } from "@/lib/validations/finance";
import type { ContractStatus } from "@/lib/finance/utils";

export function useContractMutations(slug: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts", slug] });
  };

  const createContract = useMutation({
    mutationFn: (input: CreateContractInput) => createContractAction(slug, input),
    onSuccess: invalidate,
  });

  const updateContract = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateContractInput }) =>
      updateContractAction(slug, id, input),
    onSuccess: invalidate,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContractStatus }) =>
      updateContractStatusAction(slug, id, status),
    onSuccess: invalidate,
  });

  const removeContract = useMutation({
    mutationFn: (id: string) => deleteContractAction(slug, id),
    onSuccess: invalidate,
  });

  const duplicateContract = useMutation({
    mutationFn: (id: string) => duplicateContractAction(slug, id),
    onSuccess: invalidate,
  });

  const generateInvoices = useMutation({
    mutationFn: () => generateRecurringInvoicesAction(slug),
    onSuccess: invalidate,
  });

  return {
    createContract,
    updateContract,
    updateStatus,
    removeContract,
    duplicateContract,
    generateInvoices,
  };
}
