import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Templates } from '../common/templates';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}
  async sendResetPasswordEmail(email: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'perfectingthevoid@gmail.com',
        pass: this.configService.get('gmail_pass'), // Uses value from Docker secret or env
      },
    });
    const mailOptions = {
      from: 'perfectingthevoid@gmail.com',
      to: email,
      subject: 'Reset password',
      text: 'Reset your password',
      html: Templates.passwordReset,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('Mail sent');
      }
    });
  }

  /**
   * Helper to inject the OTP into the passwordReset template
   */
  private renderOtpTemplate(otp: string): string {
    // Replace the hardcoded OTP in the template with the actual OTP
    return Templates.passwordReset.replace(
      /<div class="otp-code">\d{6}<\/div>/,
      `<div class="otp-code">${otp}</div>`,
    );
  }

  async sendOtpEmail(email: string, otp: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'perfectingthevoid@gmail.com',
        pass: this.configService.get('gmail_pass'),
      },
    });
    const mailOptions = {
      from: 'perfectingthevoid@gmail.com',
      to: email,
      subject: 'OTP Kod',
      text: `Sizin OTP kodunuz: ${otp}`,
      html: this.renderOtpTemplate(otp),
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log('OTP mail sent');
      }
    });
  }
}
