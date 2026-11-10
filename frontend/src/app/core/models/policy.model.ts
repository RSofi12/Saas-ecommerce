export interface GarmentExchangePolicy {
  codigo: string;
  titulo: string;
  regla_precio_mayor: string;
  regla_precio_menor_o_igual: string;
  inspeccion_fisica: string;
  plazos: string;
}

export interface GarmentReturnPolicy {
  codigo: string;
  titulo: string;
  retencion_operativa: string;
  calculo_reembolso: string;
  modalidad_reembolso: string;
  plazos: string;
}

export interface PaymentDeliveryPolicy {
  codigo: string;
  titulo: string;
  despacho_digital: string;
  ventas_offline: string;
}

export interface StockReservationPolicy {
  codigo: string;
  titulo: string;
  tiempo_reserva: string;
}

export interface SaaSTermsPolicy {
  codigo: string;
  titulo: string;
  cuotas_por_plan: {
    plan_basico: string;
    plan_profesional: string;
    plan_empresarial: string;
  };
  aislamiento_multitenant: string;
  respaldos: string;
}

export interface PlatformPoliciesData {
  cambios_de_prenda: GarmentExchangePolicy;
  devoluciones_y_reembolsos: GarmentReturnPolicy;
  pagos_y_despacho: PaymentDeliveryPolicy;
  reservas_de_stock: StockReservationPolicy;
  terminos_saas_fashionstore: SaaSTermsPolicy;
}
