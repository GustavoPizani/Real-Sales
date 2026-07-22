import { randomInt } from 'crypto';

export function generateTempPassword() {
  return `Nordic@${randomInt(100000, 1000000)}`;
}
