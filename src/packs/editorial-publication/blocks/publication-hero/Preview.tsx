import { PublicationHeroView } from "./View";

export function Preview({ content }: { content: Record<string, unknown> }) {
  return <PublicationHeroView content={content} />;
}
