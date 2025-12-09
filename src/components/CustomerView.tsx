
    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number = 0) => {
        if (!settings) return;

        const shippingCost: number = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) 
            ? (settings.shipping.fixedCost ?? 0) 
            : 0;

        const finalTotal = cartTotal + shippingCost + tipAmount;

        const newOrder: Omit<Order, 'id' | 'createdAt'> = {
            customer,
            items: cartItems,
            total: finalTotal,
            status: OrderStatus.Pending,
            branchId: 'main-branch',
            generalComments: generalComments + (tipAmount > 0 ? ` | Propina: ${settings.company.currency.code} ${tipAmount.toFixed(2)}` : ''),
            orderType: orderType,
            tableId: orderType === OrderType.DineIn && tableInfo ? `${tableInfo.zone} - ${tableInfo.table}` : undefined,
        };
