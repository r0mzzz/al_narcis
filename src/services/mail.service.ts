import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Templates } from '../common/templates';

@Injectable()
export class MailService {
  async sendResetPasswordEmail(email: string) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'perfectingthevoid@gmail.com',
        pass: 'lmjewzmuoentgyzk\n',
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
}
