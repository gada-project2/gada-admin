"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  adminControllerGetAdmins,
  getAdminControllerGetAdminsQueryKey,
  adminControllerCreateAdmin,
  adminControllerUpdateAdmin,
  adminControllerRemoveAdmin,
  adminControllerChangePassword,
} from "@/lib/api/generated/admin/admin";
import type { AdminUser, AdminUserRole, AdminUserStatus } from "@/lib/api/types/admin";
import { useAdmin } from "@/lib/hooks/useAdmin";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Spinner from "@/components/ui/Spinner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

const ROLES: AdminUserRole[] = ["SUPER_ADMIN", "ADMIN", "MODERATOR"];
const ROLE_LABELS: Record<AdminUserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
};

function RoleBadge({ role }: { role: AdminUserRole }) {
  const colours: Record<AdminUserRole, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700",
    ADMIN: "bg-blue-100 text-blue-700",
    MODERATOR: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colours[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: AdminUserStatus }) {
  return status === "ACTIVE" ? (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Active</span>
  ) : (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Suspended</span>
  );
}

// ─── Create Admin modal ───────────────────────────────────────────────────────

const createSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
    role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const),
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
    defaultValues: { role: "ADMIN" },
  });

  const mut = useMutation({
    mutationFn: (values: CreateFormValues) =>
      adminControllerCreateAdmin({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
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

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Role <span className="text-gada-danger">*</span>
            </label>
            <select
              {...register("role")}
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            {errors.role && <p className="text-xs text-gada-danger">{errors.role.message}</p>}
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

// ─── Edit Admin modal ─────────────────────────────────────────────────────────

const editSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MODERATOR"] as const),
  status: z.enum(["ACTIVE", "SUSPENDED"] as const),
});

type EditFormValues = z.infer<typeof editSchema>;

interface EditAdminModalProps {
  admin: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

function EditAdminModal({ admin, onClose, onSuccess }: EditAdminModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { role: admin.role, status: admin.status },
  });

  const mut = useMutation({
    mutationFn: (values: EditFormValues) =>
      adminControllerUpdateAdmin(admin.id, { role: values.role, status: values.status }),
    onSuccess: () => { setServerError(null); onSuccess(); },
    onError: (err) => setServerError((err as Error).message ?? "Failed to update admin"),
  });

  function onSubmit(values: EditFormValues) {
    mut.mutate(values);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gada-border-light">
          <h2 className="text-base font-bold text-gada-dark">Edit Admin</h2>
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
          className="flex flex-col gap-4 px-6 py-5"
        >
          {serverError && (
            <div className="px-4 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
              {serverError}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-muted">Name</label>
            <p className="text-sm text-gada-text-primary font-medium">{admin.name}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-muted">Email</label>
            <p className="text-sm text-gada-text-secondary">{admin.email}</p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Role <span className="text-gada-danger">*</span>
            </label>
            <select
              {...register("role")}
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            {errors.role && <p className="text-xs text-gada-danger">{errors.role.message}</p>}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gada-text-primary">
              Status <span className="text-gada-danger">*</span>
            </label>
            <select
              {...register("status")}
              className="border border-gada-border-light rounded-lg px-3 py-2 text-sm text-gada-text-primary outline-none focus:border-gada-dark bg-gada-input-bg-2"
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            {errors.status && <p className="text-xs text-gada-danger">{errors.status.message}</p>}
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
              {mut.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteAdminDialogProps {
  admin: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteAdminDialog({ admin, onClose, onSuccess }: DeleteAdminDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => adminControllerRemoveAdmin(admin.id),
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
    mutationFn: (values: PasswordFormValues) =>
      adminControllerChangePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
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
  | { type: "edit"; admin: AdminUser }
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
    queryKey: getAdminControllerGetAdminsQueryKey(),
    queryFn: ({ signal }) => adminControllerGetAdmins({ signal } as RequestInit),
  });

  const admins = (data as unknown as AdminUser[] | undefined) ?? [];
  const isOnlyAdmin = admins.length <= 1;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getAdminControllerGetAdminsQueryKey() });
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
      key: "role",
      header: "Role",
      render: (row) => <RoleBadge role={row.role} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
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
          onClick={() => setModal({ type: "edit", admin: row })}
          className="px-2 py-0.5 rounded text-xs font-medium border border-gada-border-light text-gada-text-primary hover:bg-gada-surface-card transition-colors"
        >
          Edit
        </button>
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
      {modal?.type === "edit" && (
        <EditAdminModal
          admin={modal.admin}
          onClose={() => setModal(null)}
          onSuccess={() => handleSuccess("Admin updated successfully.")}
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

  const isSuperAdmin = admin?.role === "SUPER_ADMIN";

  return (
    <div className="flex flex-col gap-5">
      {/* Admin Management — SUPER_ADMIN only */}
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
