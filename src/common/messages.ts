export const Messages = {
  DELETED: (value: string) => {
    return `${value} successfully deleted`;
  },
  MAIL_SENT: 'Email successfully sent',
  OTP_NOT_REQUESTED: 'OTP has not been requested for this user',
  OTP_INVALID: 'The provided OTP is invalid',
  OTP_EXPIRED: 'The OTP has expired',
};
