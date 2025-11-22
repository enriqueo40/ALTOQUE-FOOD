

import React from 'react';
import { Product, Category, Order, OrderStatus, Conversation, Personalization, Promotion, Zone, Customer, OrderType, DiscountType, PromotionAppliesTo, Table, Currency, AppSettings, ShippingCostType, PrintingMethod } from './types';

// SVG Icon Components
// Fix: Added optional title prop for accessibility/tooltips.
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
export const IconChatAdmin: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 01-2.53-.442c.395-.493.588-1.14.588-1.81V12.75H4.5v2.25c0 .67.193 1.317.588 1.81a9.76 9.76 0 01-2.53.442C4.03 20.25 0 16.556 0 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" className={className} />;
export const IconSettings: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M10.343 3.94c.09-.542.56-1.008 1.11-1.212l.06-.025a1.875 1.875 0 011.97 0l.06.025c.55.204 1.02.67 1.11 1.212l.044.262a.75.75 0 001.344.144l.243-.209a1.875 1.875 0 012.352.53l.05.071a1.875 1.875 0 01-.53 2.352l-.209.243a.75.75 0 00-.144 1.344l-.262.044c-.542.09-1.008.56-1.212 1.11l-.025.06a1.875 1.875 0 01-1.97 0l-.025-.06c-.204-.55-.67-1.02-1.212-1.11l-.262-.044a.75.75 0 00-1.344.144l-.243.209a1.875 1.875 0 01-2.352-.53l-.05-.071a1.875 1.875 0 01.53-2.352l.209-.243a.75.75 0 00.144-1.344l.262-.044zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" className={className} />;
export const IconLogout: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" className={className} />;
export const IconSearch: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" className={className} />;
export const IconBell: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.31 6.032 23.848 23.848 0 005.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" className={className} />;
export const IconEdit: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" className={className} />;
export const IconToggleOn: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M3.75 12a8.25 8.25 0 1016.5 0 8.25 8.25 0 00-16.5 0zM12 18.75a.75.75 0 100-1.5.75.75 0 000 1.5z" className={className} />;
export const IconToggleOff: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 9.75a.75.75 0 100-1.5.75.75 0 000 1.5zm0 2.25a.75.75 0 100-1.5.75.75 0 000 1.5zM12 15a.75.75 0 100-1.5.75.75 0 000 1.5zM3.75 12a8.25 8.25 0 1016.5 0 8.25 8.25 0 00-16.5 0z" className={className} />;
export const IconMoreVertical: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" className={className} />;
export const IconArrowUp: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.517l2.74-1.22m0 0l-3.75-2.25M21 12l-2.25-3.75" className={className} />;
export const IconArrowDown: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.182" className={className} />;
export const IconSparkles: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM18.259 15.315L18 14.25l-.259 1.065a3.375 3.375 0 00-2.455 2.456L14.25 18l1.036.259a3.375 3.375 0 002.455 2.456L18 21.75l.259-1.035a3.375 3.375 0 002.456-2.456L21.75 18l-1.035-.259a3.375 3.375 0 00-2.456-2.456z" className={className} />;
export const IconExternalLink: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" className={className} />;
export const IconReceipt: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" className={className} />;
export const IconStore: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25a.75.75 0 01-.75-.75v-9a.75.75 0 01.75-.75h21a.75.75 0 01.75.75v9a.75.75 0 01-.75-.75h-5.25m-4.5 0h-4.5" className={className} />;
export const IconDelivery: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h10.5a1.125 1.125 0 001.125-1.125V6.75a1.125 1.125 0 00-1.125-1.125H4.5A1.125 1.125 0 003.375 6.75v10.5a1.125 1.125 0 001.125 1.125z" className={className} />;
export const IconPayment: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m3-5.25H21m-9 5.25h9m-9 2.25h9M2.25 9h19.5" className={className} />;
export const IconClock: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" className={className} />;
export const IconTableLayout: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9 4.5v15m6-15v15m-10.5-15h15a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25-2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75A2.25 2.25 0 014.5 4.5z" className={className} />;
export const IconPrinter: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6 3.369m0 0c.071.01.141.02.212.031m-2.212.031a23.999 23.999 0 002.212-3.329C4.718 3.05 4.118 3 3.5 3c-1.006 0-1.933.29-2.612.805A1.875 1.875 0 00.25 5.42l.256 1.024m.256 1.024a23.938 23.938 0 012.213-3.328m2.213 3.328c.071-.01.141-.02.212-.031m2.212.031a23.999 23.999 0 012.212 3.329c.502.73.914 1.524 1.258 2.372a23.999 23.999 0 012.212-3.329m2.212 3.329c.071.01.141.02.212.031m2.212.031a23.938 23.938 0 002.213 3.328m-2.213-3.328a23.999 23.999 0 00-2.212-3.329c-.502-.73-.914-1.524-1.258-2.372m-10.56 14.47c-3.14-1.59-5.11-4.75-5.11-8.21 0-5.238 4.02-9.456 9-9.456s9 4.218 9 9.456c0 3.46-1.97 6.62-5.11 8.21" className={className} />;
export const IconDuplicate: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.5a1.125 1.125 0 011.125-1.125h7.5a3.375 3.375 0 013.375 3.375z M9 1.5h6.375c.621 0 1.125.504 1.125 1.125v9.375" className={className} />;
export const IconGripVertical: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9 12.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm3 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" className={className} />;
export const IconPencil: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" className={className} />;
export const IconPercent: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M9.548 3.452a.75.75 0 010 1.096l-6 7.5a.75.75 0 11-1.096-1.096l6-7.5a.75.75 0 011.096 0zM15 7.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-2.25 6a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" className={className} />;
export const IconTag: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12.586 2.586a2 2 0 00-2.828 0L7.172 5.172a2 2 0 000 2.828l4.242 4.242a2 2 0 002.828 0l2.586-2.586a2 2 0 000-2.828l-4.242-4.242zM14.5 9.5a1 1 0 11-2 0 1 1 0 012 0z" className={className} />;
// Fix: Added optional title prop to fix type error.
export const IconInfo: React.FC<{ className?: string; title?: string }> = ({ className, title }) => <IconComponent d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" className={className} title={title} />;
export const IconLogoutAlt: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3 0l3-3m0 0l-3-3m3 3H9" className={className} />;
export const IconSun: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12 3v2.25m6.364.364l-1.591 1.591M21 12h-2.25m-.364 6.364l-1.591-1.591M12 18.75V21m-6.364-.364l1.591-1.591M3 12h2.25m.364-6.364l1.591 1.591M12 12a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" className={className} />;
export const IconMoon: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" className={className} />;
export const IconExpand: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9m5.25 11.25v-4.5m0 4.5h-4.5m4.5 0L15 15" className={className} />;
export const IconArrowLeft: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" className={className} />;
export const IconWhatsapp: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.6 14c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.5-1.5-1.8-.1-.2 0-.4.1-.5l.5-.6c.1-.1.2-.3.3-.4.1-.2 0-.3-.1-.4-.1-.1-.6-1.5-.8-2-.2-.5-.4-.4-.5-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2 1 2.4.1.1 1.5 2.3 3.6 3.2.5.2.8.3 1.1.4.5.1.9.1 1.2.1.4 0 1.1-.5 1.3-1 .2-.5.2-1 .1-1.1s-.2-.2-.4-.3zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18.2c-4.5 0-8.2-3.7-8.2-8.2S7.5 3.8 12 3.8s8.2 3.7 8.2 8.2-3.7 8.2-8.2 8.2z" />
    </svg>
);
export const IconQR: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M4 4h4v4H4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6-6h4v4h-4V4zM10 4h4v4h-4V4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zm0-6h4v4h-4v-4z" className={className} />;
export const IconPlayCircle: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M10.5 8.25l4.5 3.75-4.5 3.75V8.25z" className={className} />;
export const IconLocationMarker: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M21 10.5c0 7.142-7.5 11.25-9 11.25S3 17.642 3 10.5a9 9 0 1118 0z" className={className} />;
export const IconUpload: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" className={className} />;
export const IconCheck: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M4.5 12.75l6 6 9-13.5" className={className} />;
export const IconBluetooth: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M6.75 8.25l9 9.75-4.5 3V3l4.5 3-9 9.75" className={className} />;
export const IconUSB: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M10.5 6h3v6h-3V6zM9 12.75h6m-6 3h6m-4.5 3.75h3V21h-3v-2.25zM12 3v3m-2.25-1.5h4.5" className={className} />;
export const IconKey: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M12.75 16.5a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM12.75 16.5h-9v-1.5a3 3 0 013-3h1.5a3 3 0 013 3v1.5z" />;
export const IconVolumeUp: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" className={className} />;
export const IconVolumeOff: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" className={className} />;


// Mock Data
export const CATEGORIES: Category[] = [
    { id: 'coffee', name: 'Artisanal Coffees' },
    { id: 'pastries', name: 'Fresh Pastries' },
    { id: 'savory', name: 'Savory Bites' },
    { id: 'cold-brew', name: 'Cold Brews & Teas' },
    { id: 'pollo', name: 'Pollo' }
];

export const PRODUCTS: Product[] = [
    // Coffees
    { id: 'prod-001', name: 'Classic Espresso', description: 'A rich and aromatic shot of pure coffee excellence.', price: 3.50, imageUrl: 'https://images.unsplash.com/photo-1579992305423-333c02b2a16d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'coffee', available: true },
    { id: 'prod-002', name: 'Velvet Latte', description: 'Smooth espresso with perfectly steamed milk and a delicate layer of foam.', price: 5.00, imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'coffee', available: true },
    { id: 'prod-003', name: 'Caramel Macchiato', description: 'Steamed milk, vanilla, espresso, and a buttery caramel drizzle.', price: 5.50, imageUrl: 'https://images.unsplash.com/photo-1596707328198-333c02b2a16d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'coffee', available: true },
    { id: 'prod-004', name: 'Spiced Chai Latte', description: 'Aromatic spiced tea blended with steamed milk for a cozy embrace.', price: 5.25, imageUrl: 'https://images.unsplash.com/photo-1578899842593-9c173d1226a4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'coffee', available: false },
    // Pastries
    { id: 'prod-005', name: 'Almond Croissant', description: 'Flaky, buttery croissant with a sweet almond filling, topped with toasted almonds.', price: 4.50, imageUrl: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'pastries', available: true },
    { id: 'prod-006', name: 'Blueberry Scone', description: 'A tender, crumbly scone bursting with juicy blueberries and a hint of lemon.', price: 4.00, imageUrl: 'https://images.unsplash.com/photo-1621433940871-4355938d1505?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'pastries', available: true },
    { id: 'prod-007', name: 'Chocolate Chip Cookie', description: 'The perfect cookie: crispy edges, a soft chewy center, and loaded with chocolate.', price: 3.00, imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'pastries', available: true },
    // Savory Bites
    { id: 'prod-008', name: 'Avocado Toast', description: 'Smashed avocado on toasted sourdough, topped with chili flakes and microgreens.', price: 8.50, imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'savory', available: true },
    { id: 'prod-009', name: 'Quiche Lorraine', description: 'A classic French tart with a rich filling of bacon, eggs, and cream in a pastry crust.', price: 7.50, imageUrl: 'https://images.unsplash.com/photo-1563125992-423371626330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'savory', available: true },
    // Cold Brews & Teas
    { id: 'prod-010', name: 'Classic Cold Brew', description: 'Steeped for 12 hours for a smooth, low-acid coffee experience.', price: 4.75, imageUrl: 'https://images.unsplash.com/photo-1517701559438-c38c28de08f6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'cold-brew', available: true },
    { id: 'prod-011', name: 'Iced Green Tea', description: 'Refreshing and antioxidant-rich green tea, lightly sweetened.', price: 4.00, imageUrl: 'https://images.unsplash.com/photo-1627435601361-ec25f2b74c28?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'cold-brew', available: false },
     { id: 'prod-012', name: 'alitas de pollo agridulce', description: 'ricas alitas de pollo agridule', price: 2.00, imageUrl: 'https://images.unsplash.com/photo-1598511829631-778644883995?auto=format&fit=crop&w=800&q=80', categoryId: 'pollo', available: true },
      { id: 'prod-013', name: 'papitas fritas', description: 'Aromatic spiced tea blended with steamed milk for a cozy embrace.', price: 5.25, imageUrl: 'https://images.unsplash.com/photo-1578899842593-9c173d1226a4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80', categoryId: 'pollo', available: false },
];

export const MOCK_CUSTOMER: Customer = {
    name: 'Jane Doe',
    phone: '555-123-4567',
    address: {
        colonia: 'GUANADITO SUR',
        calle: 'STA ISABEL',
        numero: '2',
        entreCalles: 'STA ISABEL',
        referencias: 'Casa amarilla'
    }
};

export const MOCK_ORDERS: Order[] = [
    // Fix: Added cartItemId to each item to satisfy the CartItem type.
    { id: 'ORD-1234', items: [{...PRODUCTS[1], cartItemId: 'mock-ci-1', quantity: 1}, {...PRODUCTS[4], cartItemId: 'mock-ci-2', quantity: 2}], customer: MOCK_CUSTOMER, status: OrderStatus.Pending, total: 14.00, createdAt: new Date(Date.now() - 5 * 60 * 1000), branchId: 'main' },
    { id: 'ORD-5678', items: [{...PRODUCTS[7], cartItemId: 'mock-ci-3', quantity: 1}], customer: MOCK_CUSTOMER, status: OrderStatus.Preparing, total: 8.50, createdAt: new Date(Date.now() - 15 * 60 * 1000), branchId: 'main' },
    { id: 'ORD-9012', items: [{...PRODUCTS[10], cartItemId: 'mock-ci-4', quantity: 1}], customer: MOCK_CUSTOMER, status: OrderStatus.Ready, total: 4.75, createdAt: new Date(Date.now() - 30 * 60 * 1000), branchId: 'main' },
    { id: 'ORD-3456', items: [{...PRODUCTS[6], cartItemId: 'mock-ci-5', quantity: 3}], customer: MOCK_CUSTOMER, status: OrderStatus.Completed, total: 9.00, createdAt: new Date(Date.now() - 60 * 60 * 1000), branchId: 'main' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
    {
        id: 'conv-1',
        customerName: 'Alice Johnson',
        lastMessage: 'Perfect, thank you!',
        lastMessageTimestamp: new Date(Date.now() - 10 * 60 * 1000),
        unreadCount: 0,
        messages: [
            { id: 'msg-1-1', sender: 'customer', text: 'Hi, do you have any gluten-free options?', timestamp: new Date(Date.now() - 12 * 60 * 1000) },
            { id: 'msg-1-2', sender: 'admin', text: 'Hello! Yes, our Avocado Toast can be made on gluten-free bread. The Chocolate Chip Cookies are also gluten-free.', timestamp: new Date(Date.now() - 11 * 60 * 1000) },
            { id: 'msg-1-3', sender: 'customer', text: 'Perfect, thank you!', timestamp: new Date(Date.now() - 10 * 60 * 1000) },
        ]
    },
    {
        id: 'conv-2',
        customerName: 'Bob Williams',
        lastMessage: 'Can I place an order for pickup?',
        lastMessageTimestamp: new Date(Date.now() - 2 * 60 * 1000),
        unreadCount: 1,
        messages: [
            { id: 'msg-2-1', sender: 'customer', text: 'Can I place an order for pickup?', timestamp: new Date(Date.now() - 2 * 60 * 1000) },
        ]
    }
];

export const MOCK_PERSONALIZATIONS: Personalization[] = [
    {
        id: 'pers-milk',
        name: 'Elige tu tipo de leche',
        label: 'Tipo de Leche',
        allowRepetition: false,
        minSelection: 1,
        maxSelection: 1,
        options: [
            { id: 'opt-milk-whole', name: 'Entera', price: 0, available: true },
            { id: 'opt-milk-skim', name: 'Descremada', price: 0, available: true },
            { id: 'opt-milk-oat', name: 'Avena', price: 0.75, available: true },
            { id: 'opt-milk-almond', name: 'Almendra', price: 0.75, available: false },
        ]
    },
    {
        id: 'pers-syrup',
        name: 'Añade un sirope',
        label: 'Sirope Extra',
        allowRepetition: true,
        maxSelection: null,
        minSelection: 0,
        options: [
            { id: 'opt-syrup-vanilla', name: 'Vainilla', price: 0.50, available: true },
            { id: 'opt-syrup-caramel', name: 'Caramelo', price: 0.50, available: true },
            { id: 'opt-syrup-hazelnut', name: 'Avellana', price: 0.50, available: false },
        ]
    }
];

export const MOCK_PROMOTIONS: Promotion[] = [
    {
      id: 'promo-1',
      name: 'Happy Hour de Café',
      discountType: DiscountType.Percentage,
      discountValue: 20,
      appliesTo: PromotionAppliesTo.SpecificProducts,
      productIds: ['prod-001', 'prod-002'],
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }
];

const MOCK_TABLES_TERRACE: Table[] = [
    { id: 't-t-1', zoneId: 'zone-terrace', name: 'T1', row: 1, col: 1, width: 1, height: 1, shape: 'square', status: 'available' },
    { id: 't-t-2', zoneId: 'zone-terrace', name: 'T2', row: 1, col: 2, width: 1, height: 1, shape: 'square', status: 'occupied' },
    { id: 't-t-3', zoneId: 'zone-terrace', name: 'T3', row: 2, col: 1, width: 2, height: 1, shape: 'square', status: 'available' },
];
const MOCK_TABLES_MAIN: Table[] = [
    { id: 't-m-1', zoneId: 'zone-main', name: 'M1', row: 1, col: 1, width: 1, height: 1, shape: 'round', status: 'available' },
    { id: 't-m-2', zoneId: 'zone-main', name: 'M2', row: 2, col: 2, width: 1, height: 1, shape: 'round', status: 'available' },
    { id: 't-m-3', zoneId: 'zone-main', name: 'M3', row: 3, col: 3, width: 1, height: 1, shape: 'round', status: 'occupied' },
    { id: 't-m-4', zoneId: 'zone-main', name: 'M4', row: 4, col: 4, width: 1, height: 1, shape: 'round', status: 'available' },
];

export const MOCK_ZONES: Zone[] = [
    { id: 'zone-terrace', name: 'Terraza', rows: 4, cols: 5, tables: MOCK_TABLES_TERRACE },
    { id: 'zone-main', name: 'Salón Principal', rows: 5, cols: 5, tables: MOCK_TABLES_MAIN },
    { id: 'zone-sala', name: 'sala', rows: 6, cols: 6, tables: [] },
];

export const CURRENCIES: Currency[] = [
    { code: 'USD', name: 'Dólar Estadounidense (USD $)' },
    { code: 'MXN', name: 'Peso Mexicano (MXN $)' },
    { code: 'EUR', name: 'Euro (EUR €)' },
    { code: 'ARS', name: 'Peso Argentino (ARS $)' },
    { code: 'PAB', name: 'Balboa Panameño (PAB B/.)' },
    { code: 'BOB', name: 'Boliviano (BOB Bs)' },
    { code: 'CRC', name: 'Colón Costarricense (CRC ₡)' },
    { code: 'NIO', name: 'Córdoba Nicaragüense (NIO C$)' },
    { code: 'PYG', name: 'Guaraní Paraguayo (PYG Gs)' },
    { code: 'HNL', name: 'Lempira Hondureño (HNL L)' },
];

export const INITIAL_SETTINGS: AppSettings = {
    company: {
        name: 'ANYVAL PARK',
        currency: { code: 'MXN', name: 'Peso Mexicano (MXN $)' },
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
        deliveryMethods: ['Efectivo'],
        pickupMethods: ['Efectivo'],
        showTipField: false,
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