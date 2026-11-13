import React from 'react';
import { AuthFlow } from './AuthFlow';
import { supabaseAuthAdapter } from '../lib/supabase';
import { DeviceAuthService } from '../lib/auth/device-auth';
import { PinLockout } from '../lib/auth/pin-lockout';
import { SessionInactivityTracker } from '../lib/auth/session-inactivity';
import { CuentasService } from '../lib/cuentas/cuentas-service';
import { VehiculosService } from '../lib/vehiculos/vehiculos-service';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const AppRoot: React.FC = () => {
  const isConfigured = React.useMemo(() => isSupabaseConfigured(), []);
  const authService = React.useMemo(() => new DeviceAuthService(supabaseAuthAdapter), []);
  const lockout = React.useMemo(() => new PinLockout(), []);
  const inactivity = React.useMemo(() => new SessionInactivityTracker(), []);
  const cuentasService = React.useMemo(() => {
    return isConfigured && supabase ? new CuentasService(supabase as any) : undefined;
  }, [isConfigured]);
  const vehiculosService = React.useMemo(() => {
    return isConfigured && supabase ? new VehiculosService(supabase as any, supabase.storage as any) : undefined;
  }, [isConfigured]);

  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-red-200 p-6">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
            !
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            Falta configurar la conexión con el servidor
          </h1>
          <p className="text-xs text-gray-600">
            Revisá que las variables de entorno de Supabase estén configuradas.
          </p>
        </div>
      </main>
    );
  }

  return (
    <AuthFlow
      authService={authService}
      lockout={lockout}
      inactivity={inactivity}
      cuentasService={cuentasService}
      vehiculosService={vehiculosService}
    />
  );
};
