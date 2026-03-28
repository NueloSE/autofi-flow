import Sidebar from "@/components/Sidebar";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">{children}</main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#18181b",
            border: "1px solid #27272a",
            color: "#e4e4e7",
            fontFamily: "monospace",
            fontSize: "13px",
          },
        }}
        theme="dark"
      />
    </div>
  );
}
