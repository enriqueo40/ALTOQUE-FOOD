
// ... (imports remain the same, just finding OrderDetailModal component)

const OrderDetailModal: React.FC<{ order: Order | null; onClose: () => void; onUpdateStatus: (id: string, status: OrderStatus) => void; onUpdatePayment: (id: string, status: PaymentStatus) => void }> = ({ order, onClose, onUpdateStatus, onUpdatePayment }) => {
    const [isClosing, setIsClosing] = useState(false);

    if (!order) return null;

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    const handleCopyOrder = () => {
         const text = `Pedido #${order.id.slice(0,5)}\nCliente: ${order.customer.name}\nTotal: $${order.total.toFixed(2)}\n\nItems:\n${order.items.map(i => `- ${i.quantity}x ${i.name}`).join('\n')}`;
         navigator.clipboard.writeText(text).then(() => alert('Pedido copiado'));
    };
    
    const handlePrint = () => {
        window.print();
    };

    const handleAdvanceStatus = () => {
        let nextStatus = OrderStatus.Pending;
        if(order.status === OrderStatus.Pending) nextStatus = OrderStatus.Confirmed;
        else if(order.status === OrderStatus.Confirmed) nextStatus = OrderStatus.Preparing;
        else if(order.status === OrderStatus.Preparing) nextStatus = OrderStatus.Ready;
        else if(order.status === OrderStatus.Ready) nextStatus = order.orderType === OrderType.Delivery ? OrderStatus.Delivering : OrderStatus.Completed;
        else if(order.status === OrderStatus.Delivering) nextStatus = OrderStatus.Completed;
        
        onUpdateStatus(order.id, nextStatus);
        handleClose();
    };

    const formattedDate = new Date(order.createdAt).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: 'numeric', minute: 'numeric', hour12: true });

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isClosing ? 'pointer-events-none' : ''}`}>
            <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} onClick={handleClose}></div>
            <div className={`bg-white dark:bg-gray-800 w-full max-w-2xl rounded-xl shadow-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] ${isClosing ? 'scale-95 opacity-0 translate-y-4' : 'scale-100 opacity-100 translate-y-0'}`}>
                
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-start bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">#{order.id.slice(0, 6).toUpperCase()}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-3">
                             <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{order.customer.name}</h2>
                             <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-mono text-sm mt-1 flex items-center gap-1">
                             <IconWhatsapp className="h-4 w-4 text-green-500"/> 
                             <a href={`https://wa.me/${order.customer.phone.replace(/\D/g,'')}`} target="_blank" className="hover:underline">{order.customer.phone}</a>
                        </p>
                    </div>
                    
                     <div className="relative group">
                        <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"><IconMoreVertical /></button>
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-lg border dark:border-gray-700 hidden group-hover:block z-10 overflow-hidden">
                             <button onClick={handleCopyOrder} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"><IconDuplicate className="h-4 w-4"/> Copiar detalles</button>
                             <button onClick={() => { onUpdateStatus(order.id, OrderStatus.Cancelled); handleClose(); }} className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2 text-sm border-t dark:border-gray-700"><IconX className="h-4 w-4"/> Cancelar pedido</button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="md:col-span-2 space-y-4">
                             <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                 <IconReceipt className="h-5 w-5 text-gray-400"/> Detalle del pedido
                             </h3>
                             <div className="space-y-3">
                                 {order.items.map((item, idx) => (
                                     <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                         <div className="flex gap-3">
                                             <span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{item.quantity}x</span>
                                             <div>
                                                 <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                                                 {item.comments && <p className="text-xs text-orange-600 dark:text-orange-300 italic mt-1 font-medium">Nota: {item.comments}</p>}
                                             </div>
                                         </div>
                                         <span className="font-semibold text-gray-700 dark:text-gray-300">${(item.price * item.quantity).toFixed(2)}</span>
                                     </div>
                                 ))}
                             </div>
                             {order.generalComments && (
                                 <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                                     <strong className="block mb-1">📝 Nota general del cliente:</strong> {order.generalComments}
                                 </div>
                             )}
                             
                             {/* Payment Proof Section */}
                             {order.paymentProof && (
                                 <div className="mt-4 border dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                                     <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                                         <IconCheck className="h-5 w-5 text-green-500"/> Comprobante de pago
                                     </h4>
                                     <div className="rounded-lg overflow-hidden border dark:border-gray-600">
                                         <img src={order.paymentProof} alt="Comprobante" className="w-full h-auto object-contain max-h-64" />
                                     </div>
                                     <a href={order.paymentProof} download={`comprobante-${order.id}.png`} className="mt-2 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                         <IconUpload className="h-4 w-4 rotate-180"/> Descargar comprobante
                                     </a>
                                 </div>
                             )}
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                    <IconLocationMarker className="h-5 w-5 text-gray-400"/> Datos de entrega
                                </h3>
                                <div className="text-sm space-y-2 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Tipo:</span>
                                        <span className="font-medium">{order.orderType}</span>
                                    </div>
                                    {order.tableId && (
                                         <div className="flex justify-between">
                                            <span className="text-gray-500">Mesa:</span>
                                            <span className="font-bold text-emerald-600">{order.tableId}</span>
                                        </div>
                                    )}
                                    {order.orderType === OrderType.Delivery && (
                                        <div className="pt-2 border-t dark:border-gray-600 mt-2">
                                            <p className="font-medium">{order.customer.address.calle} #{order.customer.address.numero}</p>
                                            <p className="text-gray-500">{order.customer.address.colonia}</p>
                                            {order.customer.address.referencias && <p className="text-xs mt-1 italic text-gray-500">"{order.customer.address.referencias}"</p>}
                                            
                                            {order.customer.address.googleMapsLink && (
                                                <a 
                                                    href={order.customer.address.googleMapsLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-semibold"
                                                >
                                                    <IconLocationMarker className="h-4 w-4"/> Ver ubicación GPS
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                             <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2 border-b dark:border-gray-700 pb-2">
                                    <IconPayment className="h-5 w-5 text-gray-400"/> Pago
                                </h3>
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg text-center">
                                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">${order.total.toFixed(2)}</p>
                                    <div className="flex justify-center mt-2">
                                         <button 
                                            onClick={() => onUpdatePayment(order.id, order.paymentStatus === 'paid' ? 'pending' : 'paid')}
                                            className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${order.paymentStatus === 'paid' ? 'bg-green-200 text-green-800 border-green-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-green-100'}`}
                                        >
                                            {order.paymentStatus === 'paid' ? 'PAGADO' : 'MARCAR PAGADO'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex gap-3 justify-end">
                     <button onClick={handlePrint} className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                         <IconPrinter className="h-5 w-5"/>
                     </button>
                     
                     {order.status !== OrderStatus.Completed && order.status !== OrderStatus.Cancelled && (
                        <button onClick={handleAdvanceStatus} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-[0.98]">
                            <IconCheck className="h-5 w-5"/>
                            {order.status === OrderStatus.Pending ? 'Confirmar Pedido' : 
                             order.status === OrderStatus.Confirmed ? 'Empezar Preparación' :
                             order.status === OrderStatus.Preparing ? 'Marcar Listo' :
                             order.status === OrderStatus.Ready ? (order.orderType === OrderType.Delivery ? 'Enviar Repartidor' : 'Entregar a Cliente') :
                             'Completar Pedido'}
                        </button>
                     )}
                </div>
            </div>
        </div>
    );
};
