import { common } from './en/common.ts';
import { header } from './en/header.ts';
import { footer } from './en/footer.ts';
import { notifications } from './en/notifications.ts';
import { requisition } from './en/requisition.ts';
import { toast } from './en/toast.ts';
import { hub } from './en/hub.ts';
import { donors } from './en/donors.ts';
import { register } from './en/register.ts';
import { sos } from './en/sos.ts';
import { tracking } from './en/tracking.ts';
import { passport } from './en/passport.ts';
import { hospitals } from './en/hospitals.ts';
import { command } from './en/command.ts';
import { docs } from './en/docs.ts';
import { access } from './en/access.ts';
import { admin } from './en/admin.ts';
import { auth } from './en/auth.ts';

export const en = {
  common,
  header,
  footer,
  notifications,
  requisition,
  toast,
  hub,
  donors,
  register,
  sos,
  tracking,
  passport,
  hospitals,
  command,
  admin,
  access,
  docs,
  auth,
};

export type Translations = typeof en;
