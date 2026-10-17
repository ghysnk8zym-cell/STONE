import type { ReactNode } from "react";

import { TitleBlock } from "./parts";
import { SectionsMenu } from "./SectionsMenu";

/**
 * Head of every Account screen: the title block (with an optional control at its right, the bell on the
 * Overview) and, below 1024, the "Account sections" menu that replaces the sidebar. The gap between the two is
 * the section gap of the layout (16 / 20 px), like the gap between all blocks of the content column.
 */
export function PageHead({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-(--layout-section-gap)">
      <div className="flex items-center gap-4">
        <TitleBlock title={title} subtitle={subtitle} />
        {trailing}
      </div>
      <SectionsMenu />
    </div>
  );
}
