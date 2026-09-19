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
      .mutation(({ input }) => assessIssue(input)),

    create: publicProcedure
      .input(z.object({
        description: z.string().min(8),
        location: z.string().max(255).default("Location pending"),
        source: z.enum(["Photo", "Text", "Voice"]).default("Text"),
        imageUrl: z.string().optional(),
        audioUrl: z.string().optional(),
        assessment: assessmentInput,
      }))
      .mutation(async ({ input }) => {
        const id = `SF-${nanoid(8).toUpperCase()}`;
        const report = await createReport({
          id,
          description: input.description,
          location: input.location || "Location pending",
          source: input.source,
          imageUrl: input.imageUrl,
          audioUrl: input.audioUrl,
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
      .query(({ input }) => getReports(input?.limit ?? 100)),

    getById: publicProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(({ input }) => getReportById(input.id)),

    dashboard: publicProcedure.query(() => getDashboardMetrics()),
  }),

  voice: router({
    transcribe: publicProcedure
      .input(z.object({
        audioBase64: z.string().min(1),
        mimeType: z.string().regex(/^audio\//),
        language: z.string().length(2).default("en"),
      }))
      .mutation(async ({ input }) => {
        const base64 = input.audioBase64.replace(/^data:[^;]+;base64,/, "");
        const audio = Buffer.from(base64, "base64");
        if (!audio.length) throw new Error("Voice recording is empty");
        if (audio.length > 16 * 1024 * 1024) throw new Error("Voice recording exceeds the 16MB limit");

        const mimeType = input.mimeType.split(";", 1)[0]?.trim().toLowerCase() || "audio/webm";
        const extension = mimeType.split("/")[1] || "webm";
        await storagePut(`voice/recording.${extension}`, audio, mimeType);
        const result = await transcribeAudioBuffer({
          audioBuffer: audio,
          mimeType,
          language: input.language,
          prompt: "Transcribe this civic complaint clearly, preserving place names and the speaker's language.",
        });
        if ("error" in result) throw new Error(result.details ? `${result.error}: ${result.details}` : result.error);
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
