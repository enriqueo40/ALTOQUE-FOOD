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
export const IconTrash: React.FC<{ className?: string }> = ({ className }) => <IconComponent d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.