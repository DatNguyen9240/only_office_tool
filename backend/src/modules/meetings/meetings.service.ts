import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AccessToken,
  EgressClient,
  WebhookReceiver,
  EncodedFileOutput,
  EncodedFileType,
} from "livekit-server-sdk";
import { PrismaService } from "../../database/prisma/prisma.service";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { TokenRequestDto } from "./dto/token-request.dto";
import { StorageService } from "../../integrations/storage/storage.service";
import { MeetingPlaybackResponse, MeetingStatus } from "@share";

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);
  private egressClient: EgressClient | null = null;

  // Safe accessor to database models before prisma generate is run locally
  private get db(): any {
    return this.prisma as any;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) {
    const livekitHost = this.configService.get<string>("LIVEKIT_URL");
    const apiKey = this.configService.get<string>("LIVEKIT_API_KEY");
    const apiSecret = this.configService.get<string>("LIVEKIT_API_SECRET");

    if (livekitHost && apiKey && apiSecret) {
      try {
        this.egressClient = new EgressClient(livekitHost, apiKey, apiSecret);
      } catch (err) {
        this.logger.warn(`Could not initialize LiveKit EgressClient: ${(err as Error).message}`);
      }
    }
  }

  async createMeeting(userId: string, dto: CreateMeetingDto) {
    const roomName = `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return this.db.meeting.create({
      data: {
        title: dto.title,
        roomName,
        status: "SCHEDULED",
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
        createdById: userId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async getMeeting(meetingId: string) {
    let meeting = await this.db.meeting.findFirst({
      where: {
        OR: [{ id: meetingId }, { roomName: meetingId }],
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        participants: true,
        recordings: true,
        analysis: {
          include: {
            decisions: true,
            actionItems: true,
            risks: true,
            questions: true,
          },
        },
      },
    });

    if (!meeting) {
      const defaultUser = await this.db.user.findFirst({ select: { id: true } });
      const createData: any = {
        title: `Cuộc họp ${meetingId}`,
        roomName: meetingId,
        status: "LIVE",
        startedAt: new Date(),
      };

      if (defaultUser) {
        createData.createdById = defaultUser.id;
      }

      meeting = await this.db.meeting.create({
        data: createData,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          participants: true,
          recordings: true,
        },
      });
    }

    return meeting;
  }

  async listUserMeetings(userId: string) {
    return this.db.meeting.findMany({
      where: {
        OR: [
          { createdById: userId },
          { participants: { some: { participantId: userId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true } },
        _count: { select: { participants: true } },
      },
    });
  }

  async generateToken(meetingId: string, userId: string, dto: TokenRequestDto) {
    const meeting = await this.getMeeting(meetingId);

    const apiKey = this.configService.get<string>("LIVEKIT_API_KEY") || "devkey";
    const apiSecret = this.configService.get<string>("LIVEKIT_API_SECRET") || "secret";
    const publicUrl = this.configService.get<string>("LIVEKIT_PUBLIC_URL") || "ws://localhost:15672";

    const participantIdentity = dto.participantId || userId;
    const participantName = dto.participantName;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: "2h",
    });

    at.addGrant({
      roomJoin: true,
      room: meeting.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    await this.db.meetingParticipant.upsert({
      where: {
        meetingId_participantId: {
          meetingId: meeting.id,
          participantId: participantIdentity,
        },
      },
      update: {
        name: participantName,
        joinedAt: new Date(),
      },
      create: {
        meetingId: meeting.id,
        participantId: participantIdentity,
        name: participantName,
        joinedAt: new Date(),
      },
    });

    if (meeting.status === "SCHEDULED") {
      await this.db.meeting.update({
        where: { id: meeting.id },
        data: { status: "LIVE", startedAt: new Date() },
      });
    }

    return {
      token,
      serverUrl: publicUrl,
      roomName: meeting.roomName,
      meetingId: meeting.id,
    };
  }

  async startRecording(meetingId: string) {
    const meeting = await this.getMeeting(meetingId);

    if (meeting.status === "RECORDING") {
      return { message: "Recording is already in progress", egressId: meeting.egressId };
    }

    if (!this.egressClient) {
      throw new InternalServerErrorException("LiveKit EgressClient is not configured");
    }

    const outputKey = `meetings/${meeting.id}/recording/meeting.mp4`;

    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: outputKey,
    });

    const info = await this.egressClient.startRoomCompositeEgress(
      meeting.roomName,
      { file: fileOutput },
      { layout: "speaker" }
    );

    const egressId = info.egressId;

    await this.db.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "RECORDING",
        egressId,
        videoObjectKey: outputKey,
      },
    });

    await this.db.meetingRecording.create({
      data: {
        meetingId: meeting.id,
        egressId,
        type: "COMPOSITE",
        objectKey: outputKey,
        status: "recording",
      },
    });

    return { message: "Recording started successfully", egressId, videoObjectKey: outputKey };
  }

  async stopRecording(meetingId: string) {
    const meeting = await this.getMeeting(meetingId);

    if (meeting.egressId && this.egressClient) {
      try {
        await this.egressClient.stopEgress(meeting.egressId);
      } catch (err) {
        this.logger.warn(`Could not stop egress ${meeting.egressId}: ${(err as Error).message}`);
      }
    }

    const endedAt = new Date();
    const startedAt = meeting.startedAt || meeting.createdAt;
    const duration = Math.max(1, (endedAt.getTime() - startedAt.getTime()) / 1000);

    await this.db.meeting.update({
      where: { id: meeting.id },
      data: {
        status: "PROCESSING",
        endedAt,
        duration,
      },
    });

    await this.db.meetingProcessingJob.upsert({
      where: {
        meetingId_jobType: {
          meetingId: meeting.id,
          jobType: "FULL_ANALYSIS",
        },
      },
      update: { status: "pending", attempts: 0 },
      create: {
        meetingId: meeting.id,
        jobType: "FULL_ANALYSIS",
        status: "pending",
      },
    });

    return { message: "Recording stopped. Analysis job queued.", meetingId: meeting.id };
  }

  async handleWebhook(body: any, authHeader: string) {
    const apiKey = this.configService.get<string>("LIVEKIT_API_KEY") || "devkey";
    const apiSecret = this.configService.get<string>("LIVEKIT_API_SECRET") || "secret";

    let event = body;
    if (authHeader) {
      const receiver = new WebhookReceiver(apiKey, apiSecret);
      event = await receiver.receive(typeof body === "string" ? body : JSON.stringify(body), authHeader);
    }

    const eventType = event.event;
    this.logger.log(`Received LiveKit webhook event: ${eventType}`);

    if (eventType === "egress_ended") {
      const egressInfo = event.egressInfo;
      if (egressInfo && egressInfo.roomName) {
        const meeting = await this.db.meeting.findUnique({
          where: { roomName: egressInfo.roomName },
        });

        if (meeting) {
          const fileResult = egressInfo.fileResults?.[0] || egressInfo.result;
          const objectKey = fileResult?.filename || meeting.videoObjectKey || `meetings/${meeting.id}/recording/meeting.mp4`;

          await this.db.meeting.update({
            where: { id: meeting.id },
            data: {
              status: "PROCESSING",
              videoObjectKey: objectKey,
              duration: egressInfo.duration ? egressInfo.duration / 1e9 : meeting.duration,
            },
          });

          await this.db.meetingProcessingJob.upsert({
            where: {
              meetingId_jobType: {
                meetingId: meeting.id,
                jobType: "FULL_ANALYSIS",
              },
            },
            update: { status: "pending" },
            create: {
              meetingId: meeting.id,
              jobType: "FULL_ANALYSIS",
              status: "pending",
            },
          });
        }
      }
    }

    return { status: "ok" };
  }

  async getPlayback(meetingId: string): Promise<MeetingPlaybackResponse> {
    const meeting = await this.getMeeting(meetingId);

    let videoUrl: string | null = null;
    if (meeting.videoObjectKey) {
      try {
        const downloadRes = await this.storageService.createDownloadUrl(meeting.videoObjectKey);
        videoUrl = typeof downloadRes === "string" ? downloadRes : downloadRes.url;
      } catch (err) {
        this.logger.warn(`Could not get signed URL for ${meeting.videoObjectKey}: ${(err as Error).message}`);
      }
    }

    return {
      meetingId: meeting.id,
      title: meeting.title,
      videoUrl,
      duration: meeting.duration || 0,
      peaks: [],
      transcriptUrl: `/api/meetings/${meeting.id}/transcript`,
      analysisStatus: meeting.status.toLowerCase() as MeetingStatus,
    };
  }

  async getTranscript(meetingId: string) {
    const segments = await this.db.meetingTranscriptSegment.findMany({
      where: { meetingId },
      orderBy: { startTime: "asc" },
    });

    return segments.map((seg: any) => ({
      id: seg.id,
      meetingId: seg.meetingId,
      participantId: seg.participantId,
      participantName: seg.participantName,
      trackId: seg.trackId || undefined,
      startTime: seg.startTime,
      endTime: seg.endTime,
      text: seg.text,
      confidence: seg.confidence || undefined,
      words: Array.isArray(seg.words) ? seg.words : [],
    }));
  }

  async getAnalysis(meetingId: string) {
    const analysis = await this.db.meetingAnalysis.findUnique({
      where: { meetingId },
      include: {
        decisions: true,
        actionItems: true,
        risks: true,
        questions: true,
      },
    });

    if (!analysis) {
      return {
        title: "Cuộc họp",
        summary: "Đang chờ xử lý và phân tích nội dung cuộc họp...",
        topics: [],
        decisions: [],
        actionItems: [],
        risks: [],
        unansweredQuestions: [],
      };
    }

    return {
      title: analysis.title,
      summary: analysis.summary,
      topics: Array.isArray(analysis.topics) ? analysis.topics : [],
      decisions: analysis.decisions.map((d: any) => ({
        id: d.id,
        content: d.content,
        decidedByParticipantIds: d.decidedByParticipantIds,
        evidenceSegmentIds: d.evidenceSegmentIds,
      })),
      actionItems: analysis.actionItems.map((a: any) => ({
        id: a.id,
        task: a.task,
        assigneeParticipantId: a.assigneeParticipantId,
        assigneeName: a.assigneeName,
        deadline: a.deadline,
        status: a.status as "open" | "completed",
        confidence: a.confidence,
        evidenceSegmentIds: a.evidenceSegmentIds,
      })),
      risks: analysis.risks.map((r: any) => ({
        id: r.id,
        risk: r.risk,
        mitigation: r.mitigation,
        evidenceSegmentIds: r.evidenceSegmentIds,
      })),
      unansweredQuestions: analysis.questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        evidenceSegmentIds: q.evidenceSegmentIds,
      })),
    };
  }

  async reanalyze(meetingId: string) {
    await this.getMeeting(meetingId);

    await this.db.meeting.update({
      where: { id: meetingId },
      data: { status: "PROCESSING" },
    });

    await this.db.meetingProcessingJob.upsert({
      where: {
        meetingId_jobType: {
          meetingId,
          jobType: "FULL_ANALYSIS",
        },
      },
      update: { status: "pending", attempts: 0, error: null },
      create: {
        meetingId,
        jobType: "FULL_ANALYSIS",
        status: "pending",
      },
    });

    return { message: "Re-analysis triggered successfully", meetingId };
  }
}
