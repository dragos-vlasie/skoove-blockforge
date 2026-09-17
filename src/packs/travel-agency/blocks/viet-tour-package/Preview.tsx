import { VietTourPackageView, type VietTourPackageContent } from "./View";

export function Preview({ content }: { content: VietTourPackageContent }) {
  return <VietTourPackageView content={content} />;
}
