import { useRef, useState } from "react";

import { api, ApiError } from "../api.ts";
import { useI18n } from "../i18n.tsx";
import { AI_VOICE } from "@msc/shared";

type Upload = { uploadUrl: string; publicUrl: string; headers: Record<string, string> };

// Imagen o audio: se sube directo a R2 con una URL firmada, o se pega una URL existente.
// Un audio dice siempre quién pone la voz (CLAUDE.md, SDD-05 US-30): "ai" o el nombre de la persona.
export function MediaField({
  label,
  kind,
  value,
  onChange,
  voice,
  onVoiceChange,
  required,
  testId,
}: {
  label: string;
  kind: "image" | "audio";
  value: string;
  onChange: (url: string) => void;
  voice?: string;
  onVoiceChange?: (voice: string) => void;
  required?: boolean;
  testId?: string;
}) {
  const { t } = useI18n();
  const [voiceMode, setVoiceMode] = useState<"" | "ai" | "person">(voice === AI_VOICE ? "ai" : voice ? "person" : "");
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error" | "no-storage">("idle");

  const upload = async (file: File) => {
    setState("uploading");
    try {
      const u = await api<Upload>("/admin/uploads", { method: "POST", body: { kind, contentType: file.type, size: file.size } });
      const res = await fetch(u.uploadUrl, { method: "PUT", headers: u.headers, body: file });
      if (!res.ok) throw new Error(`R2 ${res.status}`);
      onChange(u.publicUrl);
      setState("idle");
    } catch (e) {
      setState(e instanceof ApiError && e.code === "storage_not_configured" ? "no-storage" : "error");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="field media-field" data-testid={testId}>
      {label}
      <div className="row">
        <input
          type="url"
          required={required}
          value={value}
          placeholder="https://"
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <button className="btn" type="button" disabled={state === "uploading"} onClick={() => input.current?.click()}>
          {state === "uploading" ? t("uploading") : t("uploadFile")}
        </button>
        {value && (
          <button className="btn" type="button" onClick={() => onChange("")}>
            {t("remove")}
          </button>
        )}
        <input
          ref={input}
          type="file"
          hidden
          accept={kind === "image" ? "image/jpeg,image/png,image/webp" : "audio/mpeg,audio/mp4,audio/x-m4a,audio/aac"}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
      </div>
      <span className="muted">{kind === "image" ? t("imageHint") : t("audioHint")}</span>
      {state === "no-storage" && <span className="error">{t("storageMissing")}</span>}
      {state === "error" && <span className="error">{t("uploadError")}</span>}
      {value && kind === "image" && <img className="thumb-lg" src={value} alt="" />}
      {value && kind === "audio" && <audio controls preload="none" src={value} style={{ width: "100%" }} />}
      {value && kind === "audio" && onVoiceChange && (
        <div className="row voice-row">
          <select
            required
            aria-label={t("voiceLabel")}
            data-testid={testId && `${testId}-voice`}
            value={voiceMode}
            onChange={(e) => {
              const mode = e.target.value as typeof voiceMode;
              setVoiceMode(mode);
              onVoiceChange(mode === "ai" ? AI_VOICE : "");
            }}
          >
            <option value="">{t("voiceChoose")}</option>
            <option value="ai">{t("voiceAi")}</option>
            <option value="person">{t("voicePerson")}</option>
          </select>
          {voiceMode === "person" && (
            <input
              required
              maxLength={80}
              aria-label={t("voiceName")}
              placeholder={t("voiceName")}
              data-testid={testId && `${testId}-voice-name`}
              value={voice === AI_VOICE ? "" : (voice ?? "")}
              onChange={(e) => onVoiceChange(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
          )}
        </div>
      )}
    </div>
  );
}
