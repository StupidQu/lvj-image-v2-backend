import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tencentcloud from 'tencentcloud-sdk-nodejs-ses';

const SesClient = tencentcloud.ses.v20201002.Client;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: InstanceType<typeof SesClient>;

  constructor(private configService: ConfigService) {
    this.sesClient = new SesClient({
      credential: {
        secretId: this.configService.get<string>('TENCENT_SECRET_ID')!,
        secretKey: this.configService.get<string>('TENCENT_SECRET_KEY')!,
      },
      region: this.configService.get<string>('TENCENT_SES_REGION')!,
    });
  }

  async sendVerificationCode(
    email: string,
    code: string,
    username: string,
  ): Promise<boolean> {
    try {
      const params = {
        FromEmailAddress: this.configService.get<string>(
          'TENCENT_SES_FROM_EMAIL',
        )!,
        Destination: [email],
        Subject: '邮箱验证码',
        Template: {
          TemplateID: Number(
            this.configService.get<string>('TENCENT_SES_TEMPLATE_ID')!,
          ),
          TemplateData: JSON.stringify({ verifyCode: code, username }),
        },
        TriggerType: 1, // 触发类邮件
      };

      const response = await this.sesClient.SendEmail(params);
      this.logger.log(
        `发送验证码邮件成功: ${email}, MessageId: ${response.MessageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(`发送验证码邮件失败: ${email}`, error);
      return false;
    }
  }
}
