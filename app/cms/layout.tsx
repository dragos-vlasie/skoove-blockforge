import "../../src/styles/editor.css";
import InviteRedirector from "../../src/cms/auth/InviteRedirector";

export const metadata = { title: "BlockForge CMS", robots: { index: false, follow: false } };
export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <InviteRedirector />
      {children}
    </>
  );
}
