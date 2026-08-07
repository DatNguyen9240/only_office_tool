import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
  Res,
} from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import { CreateMeetingDto } from "./dto/create-meeting.dto";
import { TokenRequestDto } from "./dto/token-request.dto";
import { JwtAuthGuard } from "../../core/auth/guards/jwt-auth.guard";

@Controller("meetings")
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createMeeting(@Req() req: any, @Body() dto: CreateMeetingDto) {
    const userId = req.user?.id || "anonymous";
    return this.meetingsService.createMeeting(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async listUserMeetings(@Req() req: any) {
    const userId = req.user?.id || "anonymous";
    return this.meetingsService.listUserMeetings(userId);
  }

  @Get(":meetingId")
  async getMeeting(@Param("meetingId") meetingId: string) {
    return this.meetingsService.getMeeting(meetingId);
  }

  @Post(":meetingId/token")
  async generateToken(
    @Param("meetingId") meetingId: string,
    @Req() req: any,
    @Body() dto: TokenRequestDto
  ) {
    const userId = req.user?.id || "anonymous";
    return this.meetingsService.generateToken(meetingId, userId, dto);
  }

  @Post(":meetingId/start-recording")
  async startRecording(@Param("meetingId") meetingId: string) {
    return this.meetingsService.startRecording(meetingId);
  }

  @Post(":meetingId/stop-recording")
  async stopRecording(@Param("meetingId") meetingId: string) {
    return this.meetingsService.stopRecording(meetingId);
  }

  @Get(":meetingId/playback")
  async getPlayback(@Param("meetingId") meetingId: string) {
    return this.meetingsService.getPlayback(meetingId);
  }

  @Get(":meetingId/video")
  async streamVideo(
    @Param("meetingId") meetingId: string,
    @Headers("range") range: string,
    @Res() res: any,
  ) {
    const { statusCode, headers, streamOrBuffer } = await this.meetingsService.getVideoStream(meetingId, range);
    if (!streamOrBuffer) {
      return res.status(404).send("Video content is unavailable");
    }
    res.status(statusCode).set(headers);
    if (Buffer.isBuffer(streamOrBuffer)) {
      res.end(streamOrBuffer);
    } else {
      (streamOrBuffer as any).pipe(res);
    }
  }

  @Get(":meetingId/transcript")
  async getTranscript(@Param("meetingId") meetingId: string) {
    return this.meetingsService.getTranscript(meetingId);
  }

  @Get(":meetingId/analysis")
  async getAnalysis(@Param("meetingId") meetingId: string) {
    return this.meetingsService.getAnalysis(meetingId);
  }

  @Post(":meetingId/reanalyze")
  async reanalyze(@Param("meetingId") meetingId: string) {
    return this.meetingsService.reanalyze(meetingId);
  }
}

@Controller("livekit")
export class LivekitWebhookController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post("webhook")
  async handleWebhook(
    @Body() body: any,
    @Headers("authorization") authHeader: string
  ) {
    return this.meetingsService.handleWebhook(body, authHeader);
  }
}
