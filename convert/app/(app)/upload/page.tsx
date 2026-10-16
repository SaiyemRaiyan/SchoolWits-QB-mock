import { UploadClient } from "./upload-client";

import "@/styles/question-content.css";
import "katex/dist/katex.min.css";

export const metadata = { title: "Upload · School Wits Question Bank" };

export default function UploadPage() {
  return <UploadClient />;
}
