import { PublicationGatewayCarouselView } from "./View";

export function Preview({ content }: { content: Record<string, unknown> }) {
  return <PublicationGatewayCarouselView content={content} />;
}
