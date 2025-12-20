"use client";

import { useState, useRef,useEffect } from "react";
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

const [tags, setTags] = useState<
{ id: string; x: number; y: number; name: string }[] >([]);

async function loadTags() {
  const database = await getDb();
  const allTags = await database.getAll("tags");
  const filtered = allTags.filter(
    (tag: { id: string; x: number; y: number; name: string; photoId: string }) => tag.photoId === photoId
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


  return (
    <main className="h-screen bg-black flex items-center justify-center">
        <button
        onClick={() => router.back()}
        className=" absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
        ← Back
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

        {tags.map((tag, i) => (
        <div
            key={i}
            className="absolute bg-black text-white text-xs px-2 py-1 rounded"
            style={{
            left: `${tag.x * 100}%`,
            top: `${tag.y * 100}%`,
            }}
            >
            {tag.name}
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
        <div className="w-4 h-4 bg-white rounded-full mb-2" />

            <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Who is this?"
            className="px-3 py-2 rounded-lg text-sm text-white shadow placeholder-white/100"
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
            className="mt-2 ml-2 px-3 py-1 bg-black text-white rounded text-sm"
            > Save
            </button>
        </div>
        )}
    </div>
    </main>
  );
}
