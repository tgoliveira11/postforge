import { ImageResponse } from "next/og";

export const alt = "PostForge social preview";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  const title = process.env.APP_NAME?.trim() || "PostForge";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f8fafc",
          color: "#111827",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid #d1d5db",
            display: "flex",
            flexDirection: "column",
            gap: 28,
            height: "100%",
            justifyContent: "space-between",
            padding: 56,
            width: "100%",
          }}
        >
          <div
            style={{
              color: "#2563eb",
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              letterSpacing: 0,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 78,
                fontWeight: 800,
                letterSpacing: 0,
                lineHeight: 1,
              }}
            >
              Published with PostForge
            </div>
            <div
              style={{
                color: "#4b5563",
                display: "flex",
                fontSize: 30,
                lineHeight: 1.35,
                maxWidth: 860,
              }}
            >
              Markdown publishing, public discovery, and article metadata for
              independent blogs.
            </div>
          </div>
          <div
            style={{
              color: "#6b7280",
              display: "flex",
              fontSize: 24,
            }}
          >
            /blog
          </div>
        </div>
      </div>
    ),
    size
  );
}
