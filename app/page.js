"use client";

import { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";

export default function Home() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [exportNumber, setExportNumber] = useState("");
  const [exportType, setExportType] = useState(1);
  const [noteText, setNoteText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const qrContainerRef = useRef(null);

  const currentUrl =
    phoneNumber.length === 11
      ? `${window.location.origin}/track/${phoneNumber}`
      : "";

  const saveQRCodeWithNote = async () => {
    if (!qrContainerRef.current) return;

    try {
      // Create a high-resolution canvas to combine QR code and note
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const pixelRatio = window.devicePixelRatio || 1;

      // Set canvas size with higher resolution (QR code is 256px + padding + text area)
      const padding = 80; // Increased padding for better quality
      const qrSize = 512; // Increased QR code size for better quality
      const textHeight = noteText ? 120 : 0;
      const logicalWidth = qrSize + padding * 2;
      const logicalHeight = qrSize + padding * 2 + textHeight;

      // Set actual canvas size accounting for pixel ratio
      canvas.width = logicalWidth * pixelRatio;
      canvas.height = logicalHeight * pixelRatio;
      canvas.style.width = logicalWidth + "px";
      canvas.style.height = logicalHeight + "px";

      // Scale the context to ensure correct drawing operations
      ctx.scale(pixelRatio, pixelRatio);

      // Enable anti-aliasing and image smoothing
      ctx.imageSmoothingEnabled = false; // Disable for crisp QR code
      ctx.textRenderingOptimization = "optimizeQuality";

      // Fill background with white
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // Get the QR code SVG and enhance it
      const qrSvg = qrContainerRef.current.querySelector("svg");
      let svgData = new XMLSerializer().serializeToString(qrSvg);

      // Enhance SVG with better quality attributes
      svgData = svgData.replace("<svg", '<svg shape-rendering="crispEdges"');

      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        // Disable image smoothing to keep QR code crisp
        ctx.imageSmoothingEnabled = false;

        // Draw QR code on canvas at higher resolution
        ctx.drawImage(img, padding, padding, qrSize, qrSize);

        // Add note text if provided
        if (noteText) {
          // Re-enable smoothing for text
          ctx.imageSmoothingEnabled = true;
          ctx.fillStyle = "black";
          ctx.font = `${
            32 * pixelRatio
          }px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Word wrap the text with higher resolution
          const maxWidth = qrSize * 0.9; // Slightly smaller than QR code width
          const words = noteText.split(" ");
          let line = "";
          let y = qrSize + padding + 60;
          const lineHeight = 40;

          for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + " ";
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;

            if (testWidth > maxWidth && n > 0) {
              ctx.fillText(line, logicalWidth / 2, y);
              line = words[n] + " ";
              y += lineHeight;
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, logicalWidth / 2, y);
        }

        // Convert canvas to blob and download with high quality
        canvas.toBlob(
          (blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `qr-code-${phoneNumber}${
              noteText ? "-with-note" : ""
            }.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          },
          "image/png",
          1.0
        ); // Maximum quality

        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      console.error("Error saving QR code:", error);
      alert("Failed to save QR code. Please try again.");
    }
  };

  const generateExcel = async () => {
    if (!exportNumber) {
      return;
    }

    setIsProcessing(true);
    const res = await fetch(`/api/export/${exportNumber}?type=${exportType}`);
    // return;
    if (!res.ok) {
      console.error("Failed to fetch Excel file");
      setIsProcessing(false);
      return;
    }

    // Convert response to blob
    const blob = await res.blob();

    // Create temporary download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportNumber}차(${
      exportType === 1 ? "평양" : "신의주"
    }).xlsx`; // filename
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    setIsProcessing(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Enter 11-digit phone number"
          value={phoneNumber}
          onChange={(e) =>
            setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
          }
          pattern="[0-9]{11}"
        />
      </div>

      {phoneNumber.length > 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow border-2 border-blue-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">
            Scan to Track
          </h2>
          <div
            ref={qrContainerRef}
            className="p-4 bg-white rounded-lg border border-blue-200"
          >
            <QRCodeSVG value={currentUrl} size={256} />
          </div>

          <div className="mt-6 w-full space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note">Note (optional)</Label>
              <Input
                id="note"
                type="text"
                placeholder="Add a note to save with the QR code"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </div>
            <Button
              onClick={saveQRCodeWithNote}
              className="w-full"
              variant="outline"
            >
              Save QR Code
            </Button>
          </div>
        </div>
      ) : (
        <div />
      )}

      <div className="space-y-2">
        <Label htmlFor="phone">Export Label</Label>
        <div className="flex items-center gap-2">
          <Input
            id="exportId"
            type="number"
            className={"flex-1"}
            placeholder="Enter export label"
            value={exportNumber}
            onChange={(e) =>
              setExportNumber(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
          />
          <Select
            id="exportType"
            placeholder="Enter export type"
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
          >
            <option value={1}>평양</option>
            <option value={2}>신의주</option>
          </Select>
        </div>

        <Button onClick={generateExcel} className="w-full" variant="outline" disabled={isProcessing}>
          Export
        </Button>
      </div>
    </div>
  );
}
