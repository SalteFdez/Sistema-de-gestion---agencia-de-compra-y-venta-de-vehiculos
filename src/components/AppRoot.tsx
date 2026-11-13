import React from 'react';
import { AuthFlow } from './AuthFlow';
import { supabaseAuthAdapter } from '../lib/supabase';
import { DeviceAuthService } from '../lib/auth/device-auth';
import { PinLockout } from '../lib/auth/pin-lockout';
import { SessionInactivityTracker } from '../lib/auth/session-inactivity';
import { CuentasService } from '../lib/cuentas/cuentas-service';
import { supabase } from '../lib/supabase';

export const AppRoot: React.FC = () => {
  const authService = React.useMemo(() => new DeviceAuthService(supabaseAuthAdapter), []);
  const lockout = React.useMemo(() => new PinLockout(), []);
  const inactivity = React.useMemo(() => new SessionInactivityTracker(), []);
  const cuentasService = React.useMemo(() => new CuentasService(supabase as any), []);

  return (
    <AuthFlow
      authService={authService}
      lockout={lockout}
      inactivity={inactivity}
      cuentasService={cuentasService}
    />
  );
};
