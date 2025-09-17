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
        pass: this.configService.get('GMAIL_PASS'),
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

  async sendOtpEmail(email: string, otp: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'perfectingthevoid@gmail.com',
        pass: this.configService.get('GMAIL_PASS'),
      },
    });
    const mailOptions = {
      from: 'perfectingthevoid@gmail.com',
      to: email,
      subject: 'Your Password Reset Code',
      text: `Your password reset code is: ${otp}`,
      html: `<p>Your password reset code is: <b>${otp}</b></p>`,
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
