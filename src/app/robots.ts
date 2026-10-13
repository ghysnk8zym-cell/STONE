import type { MetadataRoute } from "next";

import { isIndexingEnabled, robotsRules } from "@/server/indexing";

export default function robots(): MetadataRoute.Robots {
  return robotsRules(isIndexingEnabled(process.env.INDEXING));
}
