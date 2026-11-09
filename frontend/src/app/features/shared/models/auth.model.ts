export type RolUsuario = 'superadmin' | 'administrador' | 'cliente' | 'proveedor' | 'encargado' | 'cajero' | 'delivery';

export type AmbitoAcceso = 'clientes' | 'administrativos';

export type GeneroUsuario = 'masculino' | 'femenino';

export interface UsuarioAuth {
  id: string;
  name: string;
  email: string;
  gender: GeneroUsuario;
  rol: RolUsuario;
  tenant_id?: string | null;
  branch_id: string | null;
  branch_name?: string | null;
  is_active?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  rol?: RolUsuario | null;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  gender: GeneroUsuario;
}

export interface UpdateProfileRequest {
  name: string;
  email: string;
  gender: GeneroUsuario;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: UsuarioAuth;
}
