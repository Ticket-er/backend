/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { MailService } from 'src/mail/mail.service';
import { CacheHelper } from '../cache/cache.helper';

interface QueueJob {
  name: string;
  data: any;
}

@Injectable()
export class QueueHelper {
  private readonly logger = new Logger(QueueHelper.name);
  private queue: QueueJob[] = [];
  private isProcessing = false;

  constructor(
    private mailService: MailService,
    private cloudinaryService: CloudinaryService,
    private cacheHelper: CacheHelper,
  ) {
    void this.processQueue();
  }

  /**
   * Enqueue a job
   * @param name Job name (e.g., 'send-registration', 'send-otp')
   * @param data Job data
   */
  async enqueue(name: string, data: any): Promise<void> {
    this.queue.push({ name, data });
    this.logger.log(`Enqueued job: ${name}`);
    this.processQueue();
  }

  // private readonly logger = new Logger(QueueHelper.name);

  // constructor(
  //   @InjectQueue('mail') private mailQueue: Queue,
  //   private mailService: MailService,
  // ) {}

  // async enqueue(name: string, data: any): Promise<void> {
  //   await this.mailQueue.add(name, data);
  //   this.logger.log(`Enqueued job: ${name}`);
  // }

  /**
   * Process the queue (local in-memory)
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const job = this.queue.shift();

    if (job) {
      try {
        await this.processJob(job);
        this.logger.log(`Processed job: ${job.name}`);
      } catch (error) {
        this.logger.error(`Error processing job ${job.name}: ${error.message}`);
      }
    }

    this.isProcessing = false;
    if (this.queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Process a single job
   * @param job Job to process
   */
  private async processJob(job: QueueJob): Promise<void> {
    switch (job.name) {
      case 'send-registration':
        await this.mailService.sendRegistrationMail(
          job.data.email,
          job.data.name,
        );
        break;
      case 'send-otp':
        await this.mailService.sendOtp(
          job.data.email,
          job.data.name,
          job.data.otp,
        );
        break;
      case 'send-login':
        await this.mailService.sendLoginMail(job.data.email, job.data.name);
        break;
      case 'upload-image': {
        const bannerUrl = await this.cloudinaryService.uploadImage(
          job.data.file,
          job.data.folder,
        );
        await this.cacheHelper.set(
          `upload:${job.data.fileId}`,
          { status: 'completed', bannerUrl },
          { ttl: 300 },
        );
        break;
      }
      case 'delete-image':
        await this.cloudinaryService.deleteImage(job.data.imageUrl);
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }
}
