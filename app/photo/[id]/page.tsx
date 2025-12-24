"use client";

import { useState, useRef, useEffect } from "react";
import { getDb } from "@/lib/db";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";

export default function PhotoPage() {
  const router = useRouter();

  const params = useParams();
  const photoId = params.id as string;

  const [photo, setPhoto] = useState<any>(null);

  const imageRef = useRef<HTMLImageElement | null>(null);

  const [tap, setTap] = useState<{ x: number; y: number } | null>(null);

  const [name, setName] = useState("");

  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [tags, setTags] = useState<
    { id: string; x: number; y: number; name: string }[]
  >([]);

  async function loadTags() {
    const database = await getDb();
    const allTags = await database.getAll("tags");
    const filtered = allTags.filter(
      (tag: {
        id: string;
        x: number;
        y: number;
        name: string;
        photoId: string;
      }) => tag.photoId === photoId
    );
    setTags(filtered);
  }

  useEffect(() => {
    loadTags();
  }, [photoId]);

  async function loadPhoto() {
    const database = await getDb();
    const savedPhoto = await database.get("photos", photoId);
    setPhoto(savedPhoto);
  }
  useEffect(() => {
    loadPhoto();
  }, [photoId]);

  async function saveTag() {
    if (!name || !tap) return;

    const newTag = {
      id: crypto.randomUUID(),
      photoId,
      name,
      x: tap.x,
      y: tap.y,
    };

    const database = await getDb();
    await database.put("tags", newTag);

    setTags([...tags, newTag]);
    setTap(null);
    setName("");
  }
  function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  function handleTap(e: React.MouseEvent) {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();

    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setTap({ x, y });
  }

  async function saveEdit(tag: any) {
    const database = await getDb();
    await database.put("tags", { ...tag, name: editName });

    setTags((prev) =>
      prev.map((t) => (t.id === tag.id ? { ...t, name: editName } : t))
    );

    setEditingTagId(null);
  }

  async function deletePhoto() {
    const ok = confirm("Delete this photo and all its tags?");
    if (!ok) return;

    const database = await getDb();

    // 1️⃣ Delete the photo
    await database.delete("photos", photoId);

    // 2️⃣ Delete all tags linked to this photo
    const allTags = await database.getAll("tags");
    const related = allTags.filter(
      (t: {
        id: string;
        x: number;
        y: number;
        name: string;
        photoId: string;
      }) => t.photoId === photoId
    );

    for (const tag of related) {
      await database.delete("tags", tag.id);
    }

    // 3️⃣ Go back to gallery
    router.back();
  }

  async function exportImage() {
    if (!photo || !imageRef.current) return;

    const img = new Image();
    img.src = URL.createObjectURL(photo.image);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to original image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw photo
      ctx.drawImage(img, 0, 0);

      // Draw tags
      tags.forEach((tag) => {
        const x = tag.x * canvas.width;
        const y = tag.y * canvas.height;

        // 🔹 Text style
        const fontSize = Math.max(24, canvas.width * 0.04);
        const paddingX = fontSize * 0.6;
        const paddingY = fontSize * 0.45;
        const radius = fontSize * 0.45;

        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textBaseline = "top";

        const textWidth = ctx.measureText(tag.name).width;
        const textHeight = fontSize * 1.2;

        // 🔹 Box size
        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = textHeight + paddingY * 2;

        // 🔹 Anchor logic (MATCH DOM)
        // DOM: left: x, top: y, translate(-50%, -100%)
        const boxX = x - boxWidth / 2;
        const boxY = y - boxHeight;

        // 🔹 Background
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // 60% opacity
        drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, radius);
        // 🔹 Text (centered horizontally)
        ctx.fillStyle = "white";
        ctx.fillText(tag.name, boxX + paddingX, boxY + paddingY);
      });

      // Download
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], "people-memory.png", {
          type: "image/png",
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "People Memory",
          });
        } else {
          // fallback to download
          const link = document.createElement("a");
          link.download = "people-memory.png";
          link.href = URL.createObjectURL(blob);
          link.click();
        }
      });
    };
  }

  return (
    <main className="relative h-screen bg-black flex flex-col items-center justify-between">
      <div className="relative h-16 w-full flex justify-between px-4">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="
          pointer-events-auto w-24
          absolute top-4 left-4
          bg-black/70 text-white 
          px-3 py-2 rounded-lg text-sm font-semibold"
        >
          ← Back
        </button>

        {/* Download button */}
        <button
          onClick={exportImage}
          className=" w-24
          pointer-events-auto
          absolute top-4 right-4
          bg-black/80 text-white
          px-3 py-2 rounded-lg text-sm font-semibold"
        >
          Download
        </button>
      </div>

      <div className="relative overflow-hidden">
        {photo && (
          <img
            ref={imageRef}
            src={URL.createObjectURL(photo.image)}
            onClick={handleTap}
            className="max-w-full max-h-full cursor-crosshair"
          />
        )}
        {tap && (
          <div
            className="
            absolute -translate-x-1/2 -translate-y-full"
            style={{
              left: `${tap.x * 100}%`,
              top: `${tap.y * 100}%`,
            }}
          >
            {/* 
            Input is centered exactly on the tap position.*/}
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // prevent form submit / newline
                  saveTag(); // ← Enter saves
                }
              }}
              placeholder="Who is this?"
              className="
              px-3 py-2
              rounded-lg
              text-sm
              text-white
              shadow
              placeholder-white
              bg-black/70
              focus:outline-none
              pointer-events-auto
              text-center"
            />
          </div>
        )}
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="
             absolute -translate-x-1/2 -translate-y-full touch-none"
            style={{
              left: `${tag.x * 100}%`,
              top: `${tag.y * 100}%`,
            }}
            // tap tag to edit
            onClick={() => {
              setEditingTagId(tag.id);
              setEditName(tag.name);
            }}
          >
            {editingTagId === tag.id ? (
              <div className="flex items-center bg-black rounded px-3">
                {/* EDIT INPUT */}
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveEdit(tag);
                    }
                  }}
                  onBlur={() => saveEdit(tag)}
                  className="text-sm px-3 py-2 rounded bg-black-70 text-white outline-none text-center"
                />

                {/* DELETE BUTTON */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation(); // prevent edit click

                    const ok = confirm(`Delete "${tag.name}"?`);
                    if (!ok) return;

                    const database = await getDb();
                    await database.delete("tags", tag.id);

                    setTags((prev) => prev.filter((t) => t.id !== tag.id));
                    setEditingTagId(null);
                  }}
                  className="
                text-red-400 text-sm px-3
                hover:text-red-600
              "
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 bg-black text-white text-sm px-3 py-1 rounded">
                <span>{tag.name}</span>

                {/* DELETE ICON (VISIBLE EVEN WHEN NOT EDITING) */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();

                    const ok = confirm(`Delete "${tag.name}"?`);
                    if (!ok) return;

                    const database = await getDb();
                    await database.delete("tags", tag.id);

                    setTags((prev) => prev.filter((t) => t.id !== tag.id));
                  }}
                  className="
                text-red-400 text-sm pl-3
                hover:text-red-600
              "
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="relative h-16 w-full flex justify-between px-4 my-4">
        {/* Delete button bottom*/}
        <button
          onClick={deletePhoto}
          className="
          pointer-events-auto
          absolute bottom-4 left-1/2 -translate-x-1/2
          w-[90%] max-w-md
          py-3 rounded-xl
          bg-red-500 text-white text-sm font-semibold
          active:bg-red-700"
        >
          Delete Photo ✕
        </button>
      </div>
    </main>
  );
}
