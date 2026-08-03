"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminControllerListAdmins,
  getAdminControllerListAdminsQueryKey,
  adminControllerCreateAdmin,
  adminControllerDeleteAdmin,
} from "@/lib/api/generated/admin/admin";
import { adminAuthControllerChangePassword } from "@/lib/api/generated/admin-auth/admin-auth";
import type { AdminUser } from "@/lib/api/types/admin";
import { useAdmin } from "@/lib/hooks/useAdmin";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Spinner from "@/components/ui/Spinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
//
// The admin account model changed: there is no `role` enum (SUPER_ADMIN /
// ADMIN / MODERATOR) and no `status` field. An admin is described by a single
// boolean, `isSuperAdmin`. There is also no update endpoint — admins can be
// listed, created and deleted only, so the Edit modal was removed.

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function RoleBadge({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  return isSuperAdmin ? (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
      Super Admin
    </span>
  ) : (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
      Admin
    </span>
  );
}

// ─── Create Admin modal ───────────────────────────────────────────────────────

const createSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Valid email required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
    isSuperAdmin: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type CreateFormValues = z.infer<typeof createSchema>;

interface CreateAdminModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function CreateAdminModal({ onClose, onSuccess }: CreateAdminModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { isSuperAdmin: false },
  });

  const mut = useMutation({
    mutationFn: (values: CreateFormValues) =>
      adminControllerCreateAdmin({
        name: values.name,
        email: values.email,
        password: values.password,
        isSuperAdmin: values.isSuperAdmin,
      }),
    onSuccess: () => { setServerError(null); onSuccess(); },
    onError: (err) => setServerError((err as Error).message ?? "Failed to create admin"),
  });

  function onSubmit(values: CreateFormValues) {
    mut.mutate(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gada-border-light">
          <h2 className="text-base font-bold text-gada-dark">Add Admin</h2>
          <button
            onClick={onClose}
            disabled={mut.isPending}
            className="text-gada-text-muted hover:text-gada-text-primary transition-colors disabled:opacity-50 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4 px-6 py-5 overflow-y-auto"
        >
          {serverError && (
            <div className="px-4 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {serverError}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Full name <span className="text-gada-danger">*</span>
            </label>
            <input
              {...register("name")}
              type="text"
              placeholder="e.g. Jane Doe"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            />
            {errors.name && <p className="text-xs text-gada-danger">{errors.name.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Email <span className="text-gada-danger">*</span>
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="jane@example.com"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            />
            {errors.email && <p className="text-xs text-gada-danger">{errors.email.message}</p>}
          </div>

          <div className="flex items-start gap-2">
            <input
              {...register("isSuperAdmin")}
              id="isSuperAdmin"
              type="checkbox"
              className="mt-0.5"
            />
            <label htmlFor="isSuperAdmin" className="text-xs font-medium text-gada-text-primary">
              Super Admin
              <span className="block text-gada-text-muted font-normal">
                Super admins can manage other admin accounts.
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Initial password <span className="text-gada-danger">*</span>
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="Min 8 characters"
              autoComplete="new-password"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            />
            <p className="text-xs text-gada-text-muted">
              The admin can sign in immediately and should change this on first login.
            </p>
            {errors.password && <p className="text-xs text-gada-danger">{errors.password.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Confirm password <span className="text-gada-danger">*</span>
            </label>
            <input
              {...register("confirmPassword")}
              type="password"
              placeholder="Repeat the password"
              autoComplete="new-password"
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-gada-danger">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={mut.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mut.isPending || isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark disabled:opacity-50"
            >
              {mut.isPending ? "Creating…" : "Create admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Admin modal — REMOVED ───────────────────────────────────────────────
// There is no update endpoint on the API (PATCH /v1/admin/admins/{id} does not
// exist; only GET, POST and DELETE do), and the role/status fields it edited no
// longer exist on the admin model. Admin accounts are now create-or-delete only.

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteAdminDialogProps {
  admin: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteAdminDialog({ admin, onClose, onSuccess }: DeleteAdminDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => adminControllerDeleteAdmin(admin.id),
    onSuccess: () => { setServerError(null); onSuccess(); },
    onError: (err) => setServerError((err as Error).message ?? "Failed to delete admin"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm flex flex-col p-6 gap-4">
        <h2 className="text-base font-bold text-gada-dark">Remove Admin</h2>

        <p className="text-sm text-gada-text-secondary">
          Are you sure you want to permanently remove{" "}
          <span className="font-semibold text-gada-text-primary">{admin.name}</span>{" "}
          (<span className="font-mono text-xs">{admin.email}</span>)?
          This action cannot be undone.
        </p>

        {serverError && (
          <div className="px-4 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {serverError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={mut.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gada-border-light text-gada-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {mut.isPending ? "Removing…" : "Remove admin"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Change Password panel ────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function ChangePasswordPanel() {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const mut = useMutation({
    // ChangePasswordDto is { currentPassword, newPassword } — the endpoint moved
    // to the admin-auth tag and no longer takes a confirmPassword field, so the
    // confirmation is validated client-side only.
    mutationFn: (values: PasswordFormValues) =>
      adminAuthControllerChangePassword({
        currentPassword: values.oldPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      setServerError(null);
      reset();
      setSuccessMsg("Password changed successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    },
    onError: (err) => setServerError((err as Error).message ?? "Failed to change password"),
  });

  function onSubmit(values: PasswordFormValues) {
    mut.mutate(values);
  }

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
      <div>
        <h2 className="text-base font-bold text-gada-dark">Change Password</h2>
        <p className="text-xs text-gada-text-muted mt-0.5">
          Update your own admin account password
        </p>
      </div>

      {successMsg && (
        <div className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
          {successMsg}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4 max-w-md"
      >
        {serverError && (
          <div className="px-4 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {serverError}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gada-text-primary">
            Current password <span className="text-gada-danger">*</span>
          </label>
          <input
            {...register("oldPassword")}
            type="password"
            autoComplete="current-password"
            className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
          />
          {errors.oldPassword && (
            <p className="text-xs text-gada-danger">{errors.oldPassword.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gada-text-primary">
            New password <span className="text-gada-danger">*</span>
          </label>
          <input
            {...register("newPassword")}
            type="password"
            autoComplete="new-password"
            className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
          />
          {errors.newPassword && (
            <p className="text-xs text-gada-danger">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gada-text-primary">
            Confirm new password <span className="text-gada-danger">*</span>
          </label>
          <input
            {...register("confirmPassword")}
            type="password"
            autoComplete="new-password"
            className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-gada-danger">{errors.confirmPassword.message}</p>
          )}
        </div>

        <div>
          <button
            type="submit"
            disabled={mut.isPending || isSubmitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark disabled:opacity-50"
          >
            {mut.isPending ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Admin Management section ─────────────────────────────────────────────────

type ModalState =
  | { type: "create" }
  | { type: "delete"; admin: AdminUser }
  | null;

interface AdminManagementProps {
  currentAdminId: string;
}

function AdminManagement({ currentAdminId }: AdminManagementProps) {
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<ModalState>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: getAdminControllerListAdminsQueryKey(),
    queryFn: ({ signal }) => adminControllerListAdmins({ signal } as RequestInit),
  });

  const admins = (data as unknown as AdminUser[] | undefined) ?? [];
  const isOnlyAdmin = admins.length <= 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getAdminControllerListAdminsQueryKey() });
  }

  function handleSuccess(msg: string) {
    setModal(null);
    invalidate();
    setSuccessBanner(msg);
    setTimeout(() => setSuccessBanner(null), 4000);
  }

  const columns: Column<AdminUser>[] = [
    {
      key: "sn",
      header: "S/N",
      render: (_, i) => `${i + 1}.`,
    },
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "isSuperAdmin",
      header: "Role",
      render: (row) => <RoleBadge isSuperAdmin={row.isSuperAdmin} />,
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      render: (row) => formatDate(row.lastLoginAt),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row) => formatDate(row.createdAt),
    },
  ];

  const rowActions = (row: AdminUser) => {
    const isSelf = row.id === currentAdminId;
    const canDelete = !isSelf && !isOnlyAdmin;
    const deleteTitle = isSelf
      ? "You can't remove your own account"
      : isOnlyAdmin
      ? "Cannot remove the only admin"
      : undefined;

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => canDelete && setModal({ type: "delete", admin: row })}
          disabled={!canDelete}
          title={deleteTitle}
          className="px-2 py-0.5 rounded text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    );
  };

  return (
    <>
      {modal?.type === "create" && (
        <CreateAdminModal
          onClose={() => setModal(null)}
          onSuccess={() => handleSuccess("Admin created successfully.")}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteAdminDialog
          admin={modal.admin}
          onClose={() => setModal(null)}
          onSuccess={() => handleSuccess("Admin removed successfully.")}
        />
      )}

      <div className="rounded-xl p-5 flex flex-col gap-4 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gada-dark">Admin Users</h2>
            <p className="text-xs text-gada-text-muted mt-0.5">
              Manage who has access to this dashboard
            </p>
          </div>
          <button
            onClick={() => setModal({ type: "create" })}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gada-dark hover:opacity-90 transition-opacity"
          >
            + Add admin
          </button>
        </div>

        {successBanner && (
          <div className="px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
            {successBanner}
          </div>
        )}

        <DataTable
          columns={columns}
          rows={admins}
          isLoading={isLoading}
          isError={isError}
          onRetry={refetch}
          emptyLabel="No admins found"
          rowActions={rowActions}
          meta={undefined}
          page={1}
          onPageChange={() => {}}
        />
      </div>
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SettingsAdmins() {
  const { admin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size={28} />
      </div>
    );
  }

  const isSuperAdmin = admin?.isSuperAdmin === true;

  return (
    <div className="flex flex-col gap-5">
      {/* Admin Management — super admins only */}
      {isSuperAdmin ? (
        <AdminManagement currentAdminId={admin!.id} />
      ) : (
        <div className="rounded-xl p-5 bg-white flex flex-col gap-2">
          <h2 className="text-base font-bold text-gada-dark">Admin Users</h2>
          <p className="text-sm text-gada-text-muted">
            Only Super Admins can manage admin accounts.
          </p>
        </div>
      )}

      {/* Change Password — available to all roles */}
      <ChangePasswordPanel />

      <footer className="flex items-center justify-between text-xs text-gada-text-muted pt-1 pb-2">
        <span>2025 © GADA EVENT</span>
        <span>Designed by Gadarings Technology</span>
      </footer>
    </div>
  );
}
