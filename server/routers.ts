import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { assessIssue } from "./issue-intelligence";
import { createReport, getDashboardMetrics, getReportById, getReports } from "./db";
import { nanoid } from "nanoid";
import { z } from "zod";
import { storagePut } from "./storage";
import { transcribeAudioBuffer } from "./_core/voiceTranscription";
import { awsJson, awsUpload, isAwsBackendEnabled } from "./aws-backend";

const assessmentInput = z.object({
  category: z.string().min(1),
  shortCategory: z.string().min(1),
  priority: z.enum(["High", "Medium", "Low"]),
  confidence: z.number().int().min(0).max(100),
  summary: z.string().min(1),
  evidence: z.array(z.string()).min(1).max(4),
  department: z.string().min(1),
  suggestedAction: z.string().min(1),
});

const attachmentInput = z.object({
  type: z.enum(["image", "audio"]),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  uploadedAt: z.string().datetime(),
  transcriptionRef: z.string().optional(),
});

const base64Payload = (value: string) => {
  const separatorIndex = value.indexOf(",");
  return separatorIndex >= 0 ? value.slice(separatorIndex + 1) : value;
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  reports: router({
    analyze: publicProcedure
      .input(z.object({ description: z.string().min(8), location: z.string().max(255).default("") }))
      .mutation(({ input, ctx }) => isAwsBackendEnabled(ctx.req)
        ? awsJson<{ assessment: unknown }>("/reports/analyze", input).then((result) => result.assessment as Awaited<ReturnType<typeof assessIssue>>)
        : assessIssue(input)),

    create: publicProcedure
      .input(z.object({
        description: z.string().min(8),
        location: z.string().max(255).default("Location pending"),
        source: z.enum(["Photo", "Text", "Voice"]).default("Text"),
        imageUrl: z.string().optional(),
        audioUrl: z.string().optional(),
        attachments: z.array(attachmentInput).max(12).default([]),
        assessment: assessmentInput,
      }))
      .mutation(async ({ input, ctx }) => {
        if (isAwsBackendEnabled(ctx.req)) {
          const result = await awsJson<{ report: unknown }>("/reports", input);
          return result.report;
        }
        const id = `SF-${nanoid(8).toUpperCase()}`;
        const report = await createReport({
          id,
          description: input.description,
          location: input.location || "Location pending",
          source: input.source,
          imageUrl: input.imageUrl,
          audioUrl: input.audioUrl,
          attachments: JSON.stringify(input.attachments),
          category: input.assessment.category,
          shortCategory: input.assessment.shortCategory,
          priority: input.assessment.priority,
          confidence: input.assessment.confidence,
          evidence: JSON.stringify(input.assessment.evidence),
          summary: input.assessment.summary,
          department: input.assessment.department,
          suggestedAction: input.assessment.suggestedAction,
          status: "New",
        });
        return report;
      }),

    list: publicProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(100) }).optional())
      .query(({ input, ctx }) => isAwsBackendEnabled(ctx.req)
        ? awsJson<{ reports: unknown[] }>(`/reports?limit=${input?.limit ?? 100}`).then((result) => result.reports)
        : getReports(input?.limit ?? 100)),

    getById: publicProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(({ input, ctx }) => isAwsBackendEnabled(ctx.req)
        ? awsJson<unknown>(`/reports/${encodeURIComponent(input.id)}`)
        : getReportById(input.id)),

    dashboard: publicProcedure.query(({ ctx }) => isAwsBackendEnabled(ctx.req)
      ? awsJson<Awaited<ReturnType<typeof getDashboardMetrics>>>("/dashboard")
      : getDashboardMetrics()),
  }),

  media: router({
    upload: publicProcedure
      .input(z.object({
        dataBase64: z.string().min(1),
        filename: z.string().min(1).max(180),
        mimeType: z.string().regex(/^(image|audio)\//),
      }))
      .mutation(async ({ input, ctx }) => {
        const data = Buffer.from(base64Payload(input.dataBase64), "base64");
        if (!data.length) throw new Error("Media file is empty");
        if (data.length > 16 * 1024 * 1024) throw new Error("Media file exceeds the 16MB limit");
        const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
        const mimeType = input.mimeType.split(";", 1)[0]?.trim().toLowerCase() || "application/octet-stream";
        if (isAwsBackendEnabled(ctx.req)) {
          const presigned = await awsJson<{ mediaKey: string; uploadUrl: string }>("/media/presign", { filename: safeFilename, contentType: mimeType });
          await awsUpload(presigned.uploadUrl, data, mimeType);
          return { storageKey: presigned.mediaKey, url: presigned.mediaKey, mimeType, uploadedAt: new Date().toISOString() };
        }
        const uploaded = await storagePut(`reports/media/${safeFilename}`, data, mimeType);
        return { storageKey: uploaded.key, url: uploaded.url, mimeType, uploadedAt: new Date().toISOString() };
      }),
  }),

  voice: router({
    transcribe: publicProcedure
      .input(z.object({
        audioBase64: z.string().min(1),
        mimeType: z.string().regex(/^audio\//),
        language: z.string().length(2).default("en"),
      }))
      .mutation(async ({ input }) => {
        const separatorIndex = input.audioBase64.indexOf(",");
        const base64 = separatorIndex >= 0 ? input.audioBase64.slice(separatorIndex + 1) : input.audioBase64;
        const audio = Buffer.from(base64, "base64");
        if (!audio.length) throw new Error("Voice recording is empty");
        if (audio.length > 16 * 1024 * 1024) throw new Error("Voice recording exceeds the 16MB limit");

        const mimeType = input.mimeType.split(";", 1)[0]?.trim().toLowerCase() || "audio/webm";
        const extension = mimeType.split("/")[1] || "webm";
        const uploaded = await storagePut(`voice/recording.${extension}`, audio, mimeType);
        const result = await transcribeAudioBuffer({
          audioBuffer: audio,
          mimeType,
          language: input.language,
          prompt: "Transcribe this civic complaint clearly, preserving place names and the speaker's language.",
        });
        if ("error" in result) throw new Error(result.details ? `${result.error}: ${result.details}` : result.error);
        return { ...result, attachment: { storageKey: uploaded.key, mimeType, uploadedAt: new Date().toISOString() } };
      }),
  }),
});

export type AppRouter = typeof appRouter;
