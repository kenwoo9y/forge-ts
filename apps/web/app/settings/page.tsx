import { AppLayout } from "@/components/layouts/app-layout";
import { PasswordForm } from "@/features/settings/components/password-form";
import { ProfileForm } from "@/features/settings/components/profile-form";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <ProfileForm />
        <PasswordForm />
      </div>
    </AppLayout>
  );
}
