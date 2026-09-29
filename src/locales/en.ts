import { common } from './en/common.ts';
import { header } from './en/header.ts';
import { footer } from './en/footer.ts';
import { notifications } from './en/notifications.ts';
import { requisition } from './en/requisition.ts';
import { otp } from './en/otp.ts';
import { toast } from './en/toast.ts';
import { hub } from './en/hub.ts';
import { donors } from './en/donors.ts';
import { register } from './en/register.ts';
import { sos } from './en/sos.ts';
import { tracking } from './en/tracking.ts';
import { tracker } from './en/tracker.ts';
import { passport } from './en/passport.ts';
import { hospitals } from './en/hospitals.ts';
import { command } from './en/command.ts';
import { deck } from './en/deck.ts';
import { admin } from './en/admin.ts';

export const en = {
  common,
  header,
  footer,
  notifications,
  requisition,
  otp,
  toast,
  hub,
  donors,
  register,
  sos,
  tracking,
  tracker,
  passport,
  hospitals,
  command,
  deck,
  admin,
};

export type Translations = typeof en;
