

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
    googleMapsLink?: string; // New field for GPS location
}

export interface Customer {
    name: string;
    phone: string;
    address: Address;
}

export interface Order {
    id: string;
    items: CartItem[];
    customer: Customer;
    status: OrderStatus;
    paymentStatus?: PaymentStatus; 
    paymentProof?: string; // Base64 string of the screenshot
    total: number;
    createdAt: Date;
    branchId: string;
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
    name: string; 
    zoneId: string;
    row: number; 
    col: number; 
    width: number; 
    height: number; 
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
  isOpen: boolean; // Global override for store status
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

export type PaymentMethod = 'Efectivo' | 'Pago Móvil' | 'Transferencia' | 'Zelle' | 'Punto de Venta' | 'Pago con tarjeta';

export interface PagoMovilDetails {
    bank: string;
    phone: string;
    idNumber: string; // C.I. or RIF
}

export interface TransferDetails {
    bank: string;
    accountNumber: string;
    accountHolder: string;
    idNumber: string; // C.I. or RIF
}

export interface PaymentSettings {
  deliveryMethods: PaymentMethod[];
  pickupMethods: PaymentMethod[];
  showTipField: boolean;
  pagoMovil?: PagoMovilDetails;
  transfer?: TransferDetails;
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