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
      }) => tag.photoId === photoId,
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
      prev.map((t) => (t.id === tag.id ? { ...t, name: editName } : t)),
    );

    setEditingTagId(null);
  }

  async function deleteTag(tagId: string) {
    const database = await getDb();
    await database.delete("tags", tagId);

    setTags((prev) => prev.filter((t) => t.id !== tagId));
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
      }) => t.photoId === photoId,
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

        // Dot
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Text background
        ctx.font = "16px sans-serif";
        const padding = 6;
        const textWidth = ctx.measureText(tag.name).width;

        ctx.fillStyle = "black";
        ctx.fillRect(
          x - textWidth / 2 - padding,
          y + 10,
          textWidth + padding * 2,
          24,
        );

        // Text
        ctx.fillStyle = "white";
        ctx.fillText(tag.name, x - textWidth / 2, y + 28);
      });

      // Download
      const link = document.createElement("a");
      link.download = "people-memory.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  }

  return (
    <main className="relative h-screen bg-black flex items-center justify-center">
      <button
        onClick={() => router.back()}
        className=" absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm"
      >
        ← Back
      </button>
      <button
        onClick={exportImage}
        className="
          absolute top-4 right-4
          bg-black/80 text-white
          px-3 py-2 rounded-lg text-sm
        "
      >
        Download Image
      </button>

      <div className="relative">
        {photo && (
          <img
            ref={imageRef}
            src={URL.createObjectURL(photo.image)}
            onClick={handleTap}
            className="max-w-full max-h-full cursor-crosshair"
          />
        )}

        {tags.map((tag) => (
          <div
            key={tag.id}
            className="absolute touch-none"
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
              <div className="flex items-center gap-1 bg-black rounded px-3">
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
                  className="text-sm px-3 py-2 rounded bg-black text-white outline-none"
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

        {tap && (
          <div
            className="absolute"
            style={{
              left: `${tap.x * 100}%`,
              top: `${tap.y * 100}%`,
            }}
          >
            <div className="w-4 h-4 bg-white rounded-full mb-2 border-2 border-black" />

            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Who is this?"
              className="px-3 py-2 rounded-lg text-sm text-white shadow placeholder-white bg-black/70 focus:outline-none"
            />

            <button
              onClick={async () => {
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
              }}
              className="mt-2 ml-2 px-3 py-2 bg-black text-white rounded-lg text-sm"
            >
              {" "}
              Save
            </button>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <button
          onClick={deletePhoto}
          className="
          w-full py-3 rounded-xl bg-red-600 text-white text-sm font-semibold active:bg-red-700"
        >
          Delete Photo
        </button>
      </div>
    </main>
  );
}
