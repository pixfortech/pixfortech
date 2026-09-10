import { ogSize, renderOg } from "@/lib/og";

export const alt = "Pixel Forge Technologies. We forge digital experiences.";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return renderOg({ title: "We forge digital experiences that actually earn their pixels.", eyebrow: "Web design & development studio, Kolkata" });
}
