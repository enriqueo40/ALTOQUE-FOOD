
import React from 'react';
import { Product, Category, Order, OrderStatus, Conversation, Personalization, Promotion, Zone, Customer, OrderType, DiscountType, PromotionAppliesTo, Table, Currency, AppSettings, ShippingCostType, PrintingMethod } from './types';

// SVG Icon Components
export const IconComponent: React.FC<{ d: string; className?: string; title?: string }> = ({ d, className = "h-6 w-6", title }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        {title && <title>{title}</title>}
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
);

export const IconPlus: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 4.5v15m7.5-7.5h-15" className={className} />;
export const IconMinus: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M19.5 12h-15" className={className} />;
export const IconTrash: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" className={className} />;
export const IconCoffee: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" className={className} />;
export const IconChevronUp: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M4.5 15.75l7.5-7.5 7.5 7.5" className={className} />;
export const IconChevronDown: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M19.5 8.25l-7.5 7.5-7.5-7.5" className={className} />;
export const IconChat: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.53-.442c.395-.493.588-1.14.588-1.81V12.75H4.5v2.25c0 .67.193 1.317.588 1.81a9.76 9.76 0 01-2.53.442C4.03 20.25 0 16.556 0 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" className={className} />;
export const IconX: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M6 18L18 6M6 6l12 12" className={className} />;
export const IconSend: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" className={className} />;
export const IconHome: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" className={className} />;
export const IconMenu: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" className={className} />;
export const IconAvailability: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" className={className} />;
export const IconShare: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 100-2.186m0 2.186a2.25 2.25 0 100-2.186" className={className} />;
export const IconTutorials: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" className={className} />;
export const IconCalendar: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" className={className} />;
export const IconProducts: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .962-.343 1.087-.835l.383-1.437M7.5 14.25V5.106M7.5 14.25a3 3 0 013-3h3a3 3 0 013 3M3.75 5.106c0-1.108.892-2 2-2h3.375c1.108 0 2 .892 2 2v6.144M16.5 5.106c0-1.108.892-2 2-2h3.375c1.108 0 2 .892 2 2v6.144" className={className} />;
export const IconOrders: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.5a1.125 1.125 0 011.125-1.125h7.5a3.375 3.375 0 013.375 3.375z" className={className} />;
export const IconAnalytics: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 1.5m1-1.5l1 1.5m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.5-1.5l-1-1.5m1 1.5h7.5" className={className} />;
export const IconSettings: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M10.343 3.94c.09-.542.56-1.008 1.11-1.212l.06-.025a1.875 1.875 0 011.97 0l.06.025c.55.204 1.02.67 1.11 1.212l.044.262a.75.75 0 001.344.144l.243-.209a1.875 1.875 0 012.352.53l.05.071a1.875 1.875 0 01-.53 2.352l-.209.243a.75.75 0 00-.144 1.344l-.262.044c-.542.09-1.008.56-1.212 1.11l-.025.06a1.875 1.875 0 01-1.97 0l-.025-.06c-.204-.55-.67-1.02-1.212-1.11l-.262-.044a.75.75 0 00-1.344.144l-.243.209a1.875 1.875 0 01-2.352-.53l-.05-.071a1.875 1.875 0 01.53-2.352l.209-.243a.75.75 0 00.144-1.344l.262-.044zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" className={className} />;
export const IconLogout: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" className={className} />;
export const IconSearch: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className={className} />;
export const IconInfo: React.FC<{ className?: string; title?: string }> = ({ className, title }) => <IconComponent d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" className={className} title={title} />;
export const IconArrowLeft: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" className={className} />;
export const IconWhatsapp: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.6 14c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.2 0-.4.1-.5l.5-.6c.1-.1.2-.3.3-.4.1-.2 0-.3-.1-.4-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2 1 2.4.1.1 1.5 2.3 3.6 3.2.5.2.8.3 1.1.4.5.1.9.1 1.2.1.4 0 1.1-.5 1.3-1 .2-.5.2-1 .1-1.1s-.2-.2-.4-.3zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18.2c-4.5 0-8.2-3.7-8.2-8.2S7.5 3.8 12 3.8s8.2 3.7 8.2 8.2-3.7 8.2-8.2 8.2z" />
    </svg>
);
export const IconLocationMarker: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M21 10.5c0 7.142-7.5 11.25-9 11.25S3 17.642 3 10.5a9 9 0 1118 0z" className={className} />;
export const IconStore: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25a.75.75 0 01-.75-.75v-9a.75.75 0 01.75-.75h21a.75.75 0 01.75.75v9a.75.75 0 01-.75-.75h-5.25m-4.5 0h-4.5" className={className} />;
export const IconUpload: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" className={className} />;
export const IconCheck: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M4.5 12.75l6 6 9-13.5" className={className} />;
export const IconSparkles: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" className={className} />;

// Fix: Added missing icon definitions requested by AdminView.tsx, SetupView.tsx, and CustomerView.tsx
export const IconReceipt: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" className={className} />;
export const IconMoreVertical: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" className={className} />;
export const IconPencil: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" className={className} />;
export const IconDuplicate: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.5a1.125 1.125 0 011.125-1.125h7.5a3.375 3.375 0 013.375 3.375z M9 1.5h6.375c.621 0 1.125.504 1.125 1.125v9.375" className={className} />;
export const IconGripVertical: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" className={className} />;
export const IconSun: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 3v2.25m6.364.364l-1.591 1.591M21 12h-2.25m-.364 6.364l-1.591-1.591M12 18.75V21m-6.364-.364l1.591-1.591M3 12h2.25m.364-6.364l1.591 1.591M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" className={className} />;
export const IconMoon: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" className={className} />;
export const IconExternalLink: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" className={className} />;
export const IconKey: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12.75 16.5a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM12.75 16.5h-9v-1.5a3 3 0 013-3h1.5a3 3 0 013 3v1.5z" className={className} />;
export const IconClock: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className={className} />;
export const IconTableLayout: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9 4.5v15m6-15v15m-10.5-15h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25-2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5z" className={className} />;
export const IconTag: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12.586 2.586a2 2 0 00-2.828 0L7.172 5.172a2 2 0 000 2.828l4.242 4.242a2 2 0 002.828 0l2.586-2.586a2 2 0 000-2.828l-4.242-4.242zM14.5 9.5a1 1 0 11-2 0 1 1 0 012 0z" className={className} />;
export const IconMap: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.875 1.875 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" className={className} />;

export const INITIAL_SETTINGS: AppSettings = {
    company: {
        name: 'ANYVAL PARK',
        currency: { code: 'USD', name: 'Dólar (USD $)' },
    },
    branch: {
        alias: 'ANYVAL PARK - Suc.',
        fullAddress: '',
        googleMapsLink: '',
        whatsappNumber: '+58 4146945877',
        logoUrl: '',
        coverImageUrl: '',
    },
    shipping: {
        costType: ShippingCostType.ToBeQuoted,
        fixedCost: null,
        freeShippingMinimum: null,
        enableShippingMinimum: null,
        deliveryTime: { min: 25, max: 45 },
        pickupTime: { min: 15 },
    },
    payment: {
        deliveryMethods: ['Efectivo', 'Pago Móvil'],
        pickupMethods: ['Efectivo', 'Pago Móvil'],
        showTipField: false,
        pagoMovil: {
            bank: '',
            phone: '',
            idNumber: ''
        },
        transfer: {
            bank: '',
            accountNumber: '',
            accountHolder: '',
            idNumber: ''
        }
    },
    schedules: [
        {
            id: 'general',
            name: 'Menú general',
            days: [
                { day: 'Lunes', shifts: [], isOpen: true },
                { day: 'Martes', shifts: [], isOpen: true },
                { day: 'Miércoles', shifts: [], isOpen: true },
                { day: 'Jueves', shifts: [], isOpen: true },
                { day: 'Viernes', shifts: [], isOpen: true },
                { day: 'Sábado', shifts: [], isOpen: true },
                { day: 'Domingo', shifts: [], isOpen: true },
            ]
        }
    ],
    printing: {
        method: PrintingMethod.Native,
    }
};
