import { cookies } from "next/headers";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AdminLoginForm } from "@/components/admin/login-form";
import { verifyAdminSession } from "@/lib/jwt";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authenticated = await verifyAdminSession(cookieStore.get("admin_session")?.value);

  return authenticated ? <AdminPanel /> : <AdminLoginForm />;
}
