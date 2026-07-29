# Especificação da API RESTful (Driver ERP v1)

Documento de especificação de contrato de API RESTful para o **ERP Driver Finance**, seguindo rigorosamente os padrões descritos na Skill `api-design`.

---

## 1. Convenções Globais da API

- **Base URL**: `https://api.driverfinance.app/api/v1`
- **Formato**: JSON (Content-Type: `application/json; charset=utf-8`)
- **Autenticação**: Bearer Token no Header `Authorization: Bearer <JWT_TOKEN>`
- **Nomenclatura**: Nomes de recursos em plural, minúsculos, separador kebab-case (ex: `/api/v1/reserve-buckets`). Campos em JSON em `snake_case`.

---

## 2. Padrão de Resposta Semântica

### Resposta de Sucesso (Recurso Único) `HTTP 200 OK` / `HTTP 201 Created`
```json
{
  "data": {
    "id": "e4a781b2-9a3d-4c7b-8910-123456789abc",
    "driver_id": "8f3b21a0-1234-4567-89ab-cdef01234567",
    "gross_amount": 345.50,
    "platform": "UBER",
    "total_trips": 14,
    "recorded_at": "2026-07-27T10:30:00Z"
  }
}
```

### Resposta de Coleção Paginada (Cursor-based) `HTTP 200 OK`
```json
{
  "data": [
    { "id": "uuid-1", "gross_amount": 150.00, "platform": "UBER" },
    { "id": "uuid-2", "gross_amount": 195.50, "platform": "NINETY_NINE" }
  ],
  "meta": {
    "limit": 20,
    "has_next": true,
    "next_cursor": "eyJpZCI6InV1aWQtMiIsInJlY29yZGVkX2F0IjoxNzUzNjE1ODAwfQ"
  }
}
```

### Resposta de Erro Padrão `HTTP 4xx` / `HTTP 5xx`
```json
{
  "error": {
    "code": "validation_error",
    "message": "Falha na validação dos dados de entrada.",
    "details": [
      {
        "field": "end_odometer_km",
        "message": "O odômetro final deve ser maior ou igual ao odômetro inicial (45.200 km).",
        "code": "invalid_range"
      }
    ]
  }
}
```

---

## 3. Endpoints da API Core

### 3.1 Gerenciamento de Turnos (`/shifts`)

#### `POST /api/v1/shifts/start` - Abrir Novo Turno
- **Status**: `201 Created`
- **Request Body**:
```json
{
  "vehicle_id": "v123-uuid",
  "start_odometer_km": 45200.5,
  "start_time": "2026-07-27T06:00:00Z"
}
```

#### `POST /api/v1/shifts/:id/close` - Encerrar Turno e Gerar Resumo ERP
- **Status**: `200 OK`
- **Request Body**:
```json
{
  "end_odometer_km": 45410.2,
  "end_time": "2026-07-27T16:30:00Z",
  "notes": "Trânsito pesado na ponte. Bom rendimento."
}
```
- **Response Body**:
```json
{
  "data": {
    "shift_id": "s123-uuid",
    "total_km_driven": 209.7,
    "duration_hours": 10.5,
    "gross_earnings": 380.00,
    "cpk_total": 0.82,
    "total_operating_cost": 171.95,
    "net_real_profit": 208.05,
    "net_hourly_rate": 19.81,
    "buckets_allocated": {
      "maintenance": 25.16,
      "depreciation": 37.74,
      "tax_mei": 3.00,
      "net_free_cash": 142.15
    }
  }
}
```

---

### 3.2 Lançamento de Receitas (`/earnings`)

#### `POST /api/v1/earnings` - Registrar Ganho por Plataforma
- **Status**: `201 Created`
- **Request Body**:
```json
{
  "shift_id": "s123-uuid",
  "platform": "UBER",
  "gross_amount": 250.00,
  "tips_amount": 15.00,
  "total_trips": 11,
  "ride_distance_km": 140.5
}
```

#### `GET /api/v1/earnings` - Listar Ganhos com Filtro
- **QueryParams**: `platform=UBER&start_date=2026-07-01&end_date=2026-07-27&limit=20`

---

### 3.3 Lançamento de Despesas & OCR (`/expenses`)

#### `POST /api/v1/expenses` - Registrar Despesa Manual ou Recibo
- **Status**: `201 Created`
- **Request Body**:
```json
{
  "category": "FUEL",
  "amount": 140.00,
  "odometer_km": 45350.0,
  "fuel_liters": 26.92,
  "price_per_liter": 5.20,
  "expense_date": "2026-07-27T12:15:00Z"
}
```

#### `POST /api/v1/expenses/ocr-scan` - Processar Foto do Cupom Fiscal
- **Status**: `200 OK`
- **Request**: `multipart/form-data` (arquivo `receipt_file`)
- **Response**:
```json
{
  "data": {
    "detected_category": "FUEL",
    "extracted_amount": 150.00,
    "fuel_liters": 28.84,
    "price_per_liter": 5.20,
    "fuel_type": "GASOLINE",
    "merchant_name": "Posto Shell Marginal",
    "confidence_score": 0.96
  }
}
```

---

### 3.4 Relatórios ERP & Indicadores (`/reports`)

#### `GET /api/v1/reports/cpk-summary` - Resumo de Custo por KM e DRE Operacional
- **Status**: `200 OK`
- **Response Body**:
```json
{
  "data": {
    "period": "MONTHLY_JULY_2026",
    "total_km_driven": 4200.0,
    "gross_revenue": 8400.00,
    "cpk_fixed": 0.22,
    "cpk_variable": 0.58,
    "cpk_total": 0.80,
    "total_costs": 3360.00,
    "net_profit": 5040.00,
    "profit_margin_percent": 60.0,
    "break_even_daily_target": 112.50
  }
}
```
