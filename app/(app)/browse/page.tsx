import { BrowseClient } from "./browse-client";

import "@/styles/question-content.css";
import "katex/dist/katex.min.css";

export const metadata = { title: "Browse \u00b7 School Wits Question Bank" };

export default function BrowsePage() {
  return <BrowseClient />;
}
