import { ModulesClient } from "./modules-client";

import "@/styles/question-content.css";
import "katex/dist/katex.min.css";

export const metadata = { title: "Modules · School Wits Question Bank" };

export default function ModulesPage() {
  return <ModulesClient />;
}
