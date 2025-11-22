    const getShippingCostText = () => {
        if (orderType === OrderType.TakeAway) return "Gratis";
        
        if (shipping.costType === ShippingCostType.ToBeQuoted) return "Por definir";
        if (shipping.costType === ShippingCostType.Free) return "Gratis";
        if (shipping.costType === ShippingCostType.Fixed) return `$${(shipping.fixedCost ?? 0).toFixed(2)}`;
        return "Por definir";
    };