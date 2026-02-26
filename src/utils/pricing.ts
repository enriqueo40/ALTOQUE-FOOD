import { Product, Promotion, PromotionAppliesTo, DiscountType } from '../types';

export const getDiscountedPrice = (product: Product, promotions: Promotion[]): { price: number, promotion?: Promotion } => {
    const now = new Date();
    const activePromotions = promotions.filter(p => {
        if (p.startDate && new Date(p.startDate) > now) return false;
        if (p.endDate && new Date(p.endDate) < now) return false;
        if (p.appliesTo === PromotionAppliesTo.AllProducts) return true;
        return p.productIds.includes(product.id);
    });

    if (activePromotions.length === 0) return { price: product.price };

    let bestPrice = product.price;
    let bestPromo: Promotion | undefined;

    activePromotions.forEach(promo => {
        let currentPrice = product.price;
        if (promo.discountType === DiscountType.Percentage) {
            currentPrice = product.price * (1 - promo.discountValue / 100);
        } else {
            currentPrice = Math.max(0, product.price - promo.discountValue);
        }
        if (currentPrice < bestPrice) {
            bestPrice = currentPrice;
            bestPromo = promo;
        }
    });

    return { price: bestPrice, promotion: bestPromo };
};
