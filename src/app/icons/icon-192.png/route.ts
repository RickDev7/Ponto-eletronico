import { ImageResponse } from "next/og";
import { createElement } from "react";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 42,
          background: "#4f46e5",
          color: "white",
          fontSize: 110,
          fontWeight: 800,
          fontFamily: "Arial, sans-serif",
        },
      },
      "F",
    ),
    {
      width: 192,
      height: 192,
    },
  );
}

