import { Spacer } from "../../content/SpacerElement";

export function SpacerView({ content }: { content: any }) {
  return <Spacer height={content?.height} />;
}
