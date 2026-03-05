/* Tipos compartidos entre módulos */

/* Estructura de paginación que devuelve el backend */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/* Respuesta paginada genérica */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/* Respuesta de error del backend */
export interface ApiError {
  success: boolean;
  error: string;
  request_id?: string;
}
