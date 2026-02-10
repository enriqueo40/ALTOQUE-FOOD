
export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    categoryId: string;
    available: boolean;
    created_at?: string;
}

export interface Category {
    id: string;
    name:string;
    created_at?: string;
}

export interface CartItem extends Product {
    cartItemId: string;
    quantity: number;
    comments?: string;
    selectedOptions?: PersonalizationOption[];
}

export enum OrderStatus {
    Pending = 'Pending',
    Confirmed = 'Confirmed',
    Preparing = 'In Preparation',
    Ready = 'Ready for Pickup/Delivery',
    Delivering = 'Out for Delivery',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export enum OrderType {
    DineIn = 'Para comer aqui',
    TakeAway = 'Para llevar',
    Delivery = 'Domicilio',
}

export type PaymentStatus = 'paid' | 'pending';

export interface Address {
    colonia: string;
    calle: string;
    numero: string;
    entreCalles?: string;
    referencias?: string;
    googleMapsLink?: string;
}

export interface Customer {
    name: string;
    phone: string;
    address: Address;
    paymentProof?: string;
    referenceNumber?: string;
}

export interface Order {
    id: string;
    items: CartItem[];
    customer: Customer;
    status: OrderStatus;
    paymentStatus?: PaymentStatus;
    total: number;
    tip?: number;
    createdAt: Date;
    branchId?: string;
    orderType?: OrderType;
    tableId?: string;
    generalComments?: string;
}

export interface ChatMessage {
  id: number;
  sender: 'user' | 'bot';
  text: string;
}

export interface AdminChatMessage {
  id: string;
  sender: 'admin' | 'customer';
  text: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  lastMessageTimestamp: Date;
  unreadCount: number;
  messages: AdminChatMessage[];
}

export interface PersonalizationOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface Personalization {
  id: string;
  name: string;
  label: string;
  options: PersonalizationOption[];
  allowRepetition: boolean;
  minSelection?: number;
  maxSelection?: number | null;
}

export enum DiscountType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

export enum PromotionAppliesTo {
  AllProducts = 'all_products',
  SpecificProducts = 'specific_products',
}


export interface Promotion {
  id: string;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  appliesTo: PromotionAppliesTo;
  productIds: string[];
  startDate: string; 
  endDate: string;
}

export interface Table {
    id: string;
    name: string; // The identifier shown on the table, e.g., "1", "2", "A1"
    zoneId: string;
    row: number; // Top-left starting row
    col: number; // Top-left starting column
    width: number; // How many columns it spans
    height: number; // How many rows it spans
    shape: 'square' | 'round';
    status: 'available' | 'occupied';
    created_at?: string;
}

export interface Zone {
    id: string;
    name: string;
    rows: number;
    cols: number;
    tables: Table[];
}

// --- Settings Types ---

export interface Currency {
  code: string;
  name: string;
}

export interface CompanySettings {
  name: string;
  currency: Currency;
}

export interface BranchSettings {
  alias: string;
  fullAddress: string;
  googleMapsLink: string;
  whatsappNumber: string;
  logoUrl: string;
  coverImageUrl: string;
}

export enum ShippingCostType {
  ToBeQuoted = 'Por cotizar',
  Free = 'Gratis',
  Fixed = 'Precio fijo',
}

export interface ShippingSettings {
  costType: ShippingCostType;
  fixedCost: number | null;
  freeShippingMinimum: number | null;
  enableShippingMinimum: number | null;
  deliveryTime: {
    min: number;
    max: number;
  };
  pickupTime: {
    min: number;
  };
}

export type PaymentMethod = 'Efectivo' | 'Pago con tarjeta' | 'Transferencia' | 'Pago Móvil' | 'Zelle' | 'Punto de Venta';

export interface PagoMovilDetails {
    bank: string;
    phone: string;
    idNumber: string; // C.I. or RIF
    accountNumber?: string;
}

export interface TransferDetails {
    bank: string;
    accountNumber: string;
    accountHolder: string;
    idNumber: string; // C.I. or RIF
}

export interface ZelleDetails {
    email: string;
    holder: string;
}

export interface PaymentSettings {
  deliveryMethods: PaymentMethod[];
  pickupMethods: PaymentMethod[];
  showTipField: boolean;
  pagoMovil?: PagoMovilDetails;
  transfer?: TransferDetails;
  zelle?: ZelleDetails;
}

export interface TimeRange {
  start: string;
  end: string;
}

export interface DaySchedule {
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  shifts: TimeRange[];
  isOpen: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  days: DaySchedule[];
}

export enum PrintingMethod {
    Native = "Nativa del navegador",
    Bluetooth = "Bluetooth",
    USB = "Cable USB",
}

export interface PrintingSettings {
    method: PrintingMethod;
}

export interface AppSettings {
  company: CompanySettings;
  branch: BranchSettings;
  shipping: ShippingSettings;
  payment: PaymentSettings;
  schedules: Schedule[];
  printing: PrintingSettings;
}