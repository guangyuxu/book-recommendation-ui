import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { ChatPage } from "@/pages/chat/ChatPage";
import { SettingsLayout } from "@/pages/settings/SettingsLayout";
import { OverviewSettings } from "@/pages/settings/OverviewSettings";
import { FamilySettings } from "@/pages/settings/FamilySettings";
import { MembersSettings } from "@/pages/settings/MembersSettings";
import { ChildrenSettings } from "@/pages/settings/ChildrenSettings";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ChatPage />} />
          <Route path="/c/:threadId" element={<ChatPage />} />
          <Route path="/settings" element={<SettingsLayout />}>
            <Route index element={<OverviewSettings />} />
            <Route path="family" element={<FamilySettings />} />
            <Route path="members" element={<MembersSettings />} />
            <Route path="children" element={<ChildrenSettings />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
