"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { calculateMetrics } from "@/lib/gpx/metrics";
import { GpxParseError, parseGpx } from "@/lib/gpx/parse";
import type { ParsedActivity } from "@/lib/gpx/types";
import { RoutePreview } from "./route-preview";

function UploadGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
      <path d="M16 21V6m0 0-6 6m6-6 6 6M6 20v6h20v-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

export function GpxUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const parseRequest = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [activity, setActivity] = useState<ParsedActivity | null>(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  async function acceptFile(candidate?: File) {
    setError("");
    if (!candidate) return;
    const requestId = ++parseRequest.current;
    setIsParsing(false);

    if (!candidate.name.toLowerCase().endsWith(".gpx")) {
      setFile(null);
      setActivity(null);
      setError("Оберіть файл із розширенням .gpx.");
      return;
    }

    if (candidate.size === 0) {
      setFile(null);
      setActivity(null);
      setError("Цей файл порожній. Оберіть інший GPX-файл.");
      return;
    }

    setFile(candidate);
    setActivity(null);
    setIsParsing(true);
    try {
      const content = await candidate.text();
      const track = parseGpx(content, candidate.name);
      const metrics = calculateMetrics(track);
      if (requestId === parseRequest.current) setActivity({ track, metrics });
    } catch (cause) {
      if (requestId === parseRequest.current) {
        setFile(null);
        setError(cause instanceof GpxParseError ? cause.message : "Не вдалося відкрити файл. Спробуйте інший GPX.");
      }
    } finally {
      if (requestId === parseRequest.current) setIsParsing(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length !== 1) {
      setError("Перетягніть один GPX-файл за раз.");
      return;
    }
    acceptFile(event.dataTransfer.files[0]);
  }

  function clearFile() {
    parseRequest.current += 1;
    setFile(null);
    setActivity(null);
    setError("");
    setIsParsing(false);
  }

  return (
    <>
      <div
        className={`upload-zone${isDragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          aria-label="Обрати GPX-файл"
          onChange={handleInputChange}
        />
        <div className="upload-icon"><UploadGlyph /></div>
        <div className="upload-copy" aria-live="polite">
          {isParsing ? (
            <>
              <strong className="selected-file-name" title={file?.name}>{file?.name}</strong>
              <span>Читаю GPX локально в браузері…</span>
            </>
          ) : file ? (
            <>
              <strong className="selected-file-name" title={file.name}>{file.name}</strong>
              <span>{formatFileSize(file.size)} · маршрут оброблено</span>
            </>
          ) : (
            <>
              <strong>Ваш наступний маршрут починається тут</strong>
              <span>Підтримується формат .gpx</span>
            </>
          )}
        </div>
        {file ? (
          <button className="choose-button remove-file-button" type="button" onClick={() => inputRef.current?.click()} disabled={isParsing}>
            Змінити файл <span aria-hidden="true">↗</span>
          </button>
        ) : (
          <button className="choose-button" type="button" onClick={() => inputRef.current?.click()} disabled={isParsing}>
            Обрати файл <span aria-hidden="true">↗</span>
          </button>
        )}
        <div className="drop-hint">Перетягніть файл у цю область</div>
      </div>
      <p className={`upload-error${error ? " is-visible" : ""}`} role="alert">{error}</p>
      {activity && <RoutePreview track={activity.track} metrics={activity.metrics} />}
      {file && activity && (
        <button className="reset-project-button" type="button" onClick={clearFile}>Завантажити інший маршрут</button>
      )}
    </>
  );
}
