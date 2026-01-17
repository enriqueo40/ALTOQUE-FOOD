
    const handlePlaceOrder = async (customer: Customer, paymentMethod: PaymentMethod, tipAmount: number = 0, paymentProof: string | null = null) => {
        if (!settings) return;

        const shippingCost = (orderType === OrderType.Delivery && settings.shipping.costType === ShippingCostType.Fixed) 
            ? (Number(settings.shipping.fixedCost) || 0) 
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
            paymentProof: paymentProof || undefined,
        };

        try {
            await saveOrder(newOrder);
        } catch(e) {
            console.error("Failed to save order", e);
            alert("Hubo un error al guardar tu pedido. Por favor, intenta de nuevo.");
            return; // Stop if saving fails
        }

        // Helper to format options string
        const formatOptions = (item: CartItem) => {
            if (!item.selectedOptions || item.selectedOptions.length === 0) return '';
            return item.selectedOptions.map(opt => `   + ${opt.name}`).join('\n');
        };

        let messageParts: string[];

        const itemDetails = cartItems.map(item => {
            let detail = `▪️ ${item.quantity}x ${item.name}`;
            const optionsStr = formatOptions(item);
            if (optionsStr) detail += `\n${optionsStr}`;
            if (item.comments) detail += `\n   _Nota: ${item.comments}_`;
            return detail;
        });

        const currency = settings.company.currency.code;
        const lineSeparator = "━━━━━━━━━━━━━━━━━━━━";

        const proofMessage = paymentProof ? "\n📸 *Comprobante de pago adjunto*" : "";

        if (orderType === OrderType.DineIn) {
            messageParts = [
                `🧾 *TICKET DE PEDIDO - MESA*`,
                `📍 *${settings.company.name.toUpperCase()}*`,
                lineSeparator,
                `🗓️ Fecha: ${new Date().toLocaleDateString()}`,
                `⏰ Hora: ${new Date().toLocaleTimeString()}`,
                lineSeparator,
                `🪑 *UBICACIÓN*`,
                `Zona: ${tableInfo?.zone}`,
                `Mesa: ${tableInfo?.table}`,
                `👤 Cliente: ${customer.name}`,
                lineSeparator,
                `🛒 *DETALLE DEL CONSUMO*`,
                ...itemDetails,
                ``,
                generalComments ? `📝 *NOTAS:* ${generalComments}` : '',
                lineSeparator,
                `💰 *RESUMEN*`,
                `Subtotal: ${currency} $${cartTotal.toFixed(2)}`,
                tipAmount > 0 ? `Propina: ${currency} $${tipAmount.toFixed(2)}` : '',
                `*TOTAL A PAGAR: ${currency} $${finalTotal.toFixed(2)}*`,
                lineSeparator,
                `💳 Método: ${paymentMethod}`,
                proofMessage,
                `✅ Estado: PENDIENTE DE CONFIRMACIÓN`
            ];
        } else if (orderType === OrderType.TakeAway) {
             messageParts = [
                `🧾 *TICKET PARA RECOGER*`,
                `📍 *${settings.company.name.toUpperCase()}*`,
                lineSeparator,
                `🗓️ Fecha: ${new Date().toLocaleDateString()}`,
                `⏰ Hora: ${new Date().toLocaleTimeString()}`,
                lineSeparator,
                `👤 *CLIENTE*`,
                `Nombre: ${customer.name}`,
                `Tel: ${customer.phone}`,
                `🏷️ Tipo: Para llevar (Pick-up)`,
                lineSeparator,
                `🛒 *DETALLE DEL PEDIDO*`,
                ...itemDetails,
                ``,
                generalComments ? `📝 *NOTAS:* ${generalComments}` : '',
                lineSeparator,
                `💰 *RESUMEN*`,
                `Subtotal: ${currency} $${cartTotal.toFixed(2)}`,
                tipAmount > 0 ? `Propina: ${currency} $${tipAmount.toFixed(2)}` : '',
                `*TOTAL A PAGAR: ${currency} $${finalTotal.toFixed(2)}*`,
                lineSeparator,
                `💳 Método: ${paymentMethod}`,
                proofMessage,
                `✅ Estado: PENDIENTE DE CONFIRMACIÓN`
            ];
        } else {
            // Delivery
            messageParts = [
                `🧾 *TICKET DE ENTREGA*`,
                `📍 *${settings.company.name.toUpperCase()}*`,
                lineSeparator,
                `🗓️ Fecha: ${new Date().toLocaleDateString()}`,
                `⏰ Hora: ${new Date().toLocaleTimeString()}`,
                lineSeparator,
                `👤 *CLIENTE*`,
                `Nombre: ${customer.name}`,
                `Tel: ${customer.phone}`,
                lineSeparator,
                `📍 *DIRECCIÓN DE ENTREGA*`,
                customer.address.calle ? `🏠 ${customer.address.calle} #${customer.address.numero}` : '',
                customer.address.colonia ? `🏙️ Col. ${customer.address.colonia}` : '',
                customer.address.referencias ? `👀 Ref: ${customer.address.referencias}` : '',
                lineSeparator,
                `🛒 *DETALLE DEL PEDIDO*`,
                ...itemDetails,
                ``,
                generalComments ? `📝 *NOTAS:* ${generalComments}` : '',
                lineSeparator,
                `💰 *RESUMEN*`,
                `Subtotal: ${currency} $${cartTotal.toFixed(2)}`,
                `Envío: ${shippingCost > 0 ? `$${shippingCost.toFixed(2)}` : 'Por cotizar'}`,
                tipAmount > 0 ? `Propina: ${currency} $${tipAmount.toFixed(2)}` : '',
                `*TOTAL A PAGAR: ${currency} $${finalTotal.toFixed(2)}*`,
                lineSeparator,
                `💳 Método: ${paymentMethod}`,
                proofMessage,
                `✅ Estado: PENDIENTE DE CONFIRMACIÓN`
            ];
        }

        // FIXED: Sanitize the number to ensure it's digits only. 
        // This prevents 404 errors if the user saved "+58..." or "0414..."
        const rawNumber = settings.branch.whatsappNumber || '';
        const cleanPhoneNumber = rawNumber.replace(/\D/g, ''); 

        if (!cleanPhoneNumber) {
            alert("El número de WhatsApp del restaurante no está configurado correctamente.");
            return;
        }

        const whatsappMessage = encodeURIComponent(messageParts.filter(p => p !== '').join('\n'));
        const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${whatsappMessage}`;
        
        // FIXED: Use a robust method to open WhatsApp. 
        // Some mobile browsers block window.open, so we fallback to location.href.
        const newWindow = window.open(whatsappUrl, '_blank');
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            window.location.href = whatsappUrl;
        }
        
        setView('confirmation');
    };
