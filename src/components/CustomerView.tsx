
const ProductDetailModal: React.FC<{
    product: Product, 
    onAddToCart: (product: Product, quantity: number, comments?: string, options?: PersonalizationOption[]) => void, 
    onClose: () => void,
    personalizations: Personalization[],
    promotions: Promotion[]
}> = ({product, onAddToCart, onClose, personalizations, promotions}) => {
    const [quantity, setQuantity] = useState(1);
    const [comments, setComments] = useState('');
    const [isClosing, setIsClosing] = useState(false);
    const [selectedOptions, setSelectedOptions] = useState<{ [personalizationId: string]: PersonalizationOption[] }>({});

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300); // Wait for animation
    };

    const { price: basePrice, promotion } = getDiscountedPrice(product, promotions);

    const handleOptionToggle = (personalization: Personalization, option: PersonalizationOption) => {
        setSelectedOptions(prev => {
            const currentSelection = prev[personalization.id] || [];
            const isSelected = currentSelection.some(opt => opt.id === option.id);
            
            // If single selection (Radio behavior)
            if (personalization.maxSelection === 1) {
                return { ...prev, [personalization.id]: [option] };
            }

            // Multi selection (Checkbox behavior)
            if (isSelected) {
                return { ...prev, [personalization.id]: currentSelection.filter(opt => opt.id !== option.id) };
            } else {
                if (personalization.maxSelection && currentSelection.length >= personalization.maxSelection) {
                    return prev; // Max reached
                }
                return { ...prev, [personalization.id]: [...currentSelection, option] };
            }
        });
    };

    const isOptionSelected = (pid: string, oid: string) => {
        return selectedOptions[pid]?.some(o => o.id === oid);
    };

    const totalOptionsPrice = Object.values(selectedOptions).reduce((acc, options) => acc + options.reduce((sum, opt) => sum + (opt.price || 0), 0), 0);
    const totalPrice = (basePrice + totalOptionsPrice) * quantity;
    
    // Flatten options for display and adding to cart
    const allSelectedOptions = Object.values(selectedOptions).reduce((acc, val) => acc.concat(val), [] as PersonalizationOption[]);

    const handleAdd = () => {
        onAddToCart({ ...product, price: basePrice }, quantity, comments, allSelectedOptions);
    }

    return (
        <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose}></div>
            <div className={`w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative transform transition-transform duration-300 ${isClosing ? 'translate-y-full' : 'translate-y-0'}`}>
                 
                 {/* Close Button */}
                 <button onClick={handleClose} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white z-10 backdrop-blur-md transition-colors">
                    <IconX className="h-6 w-6" />
                </button>

                {/* Image */}
                <div className="h-64 w-full flex-shrink-0 relative">
                     <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-t-3xl sm:rounded-t-2xl" />
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent h-full w-full pointer-events-none"></div>
                     {promotion && (
                        <div className="absolute top-4 left-4 z-20">
                            <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-1 border border-yellow-500">
                                <IconSparkles className="w-3 h-3" />
                                {promotion.name}
                            </div>
                        </div>
                     )}
                     {promotion && (basePrice < product.price) && (
                        <div className="absolute bottom-4 left-6 flex flex-col items-start gap-1">
                            <div className="bg-emerald-600 text-white px-3 py-0.5 rounded-full text-xs font-bold shadow-lg">
                                Ahorras ${(product.price - basePrice).toFixed(2)}
                            </div>
                        </div>
                     )}
                </div>

                <div className="p-6 flex-grow overflow-y-auto relative z-10 bg-gray-900 -mt-4 rounded-t-3xl">
                    <h2 className="text-3xl font-bold text-white mb-2">{product.name}</h2>
                    <p className="text-gray-300 leading-relaxed mb-6">{product.description}</p>
                    
                    {/* Personalizations */}
                    <div className="space-y-6">
                        {personalizations.map(p => (
                            <div key={p.id} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <h4 className="font-bold text-white">{p.name}</h4>
                                        {/* 'Obligatorio' label removed as requested */}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        {p.maxSelection === 1 ? 'Elige 1' : `Máx ${p.maxSelection || 'ilimitado'}`}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {p.options.filter(o => o.available).map(opt => {
                                        const isSelected = isOptionSelected(p.id, opt.id);
                                        const isSingleSelect = p.maxSelection === 1;
                                        
                                        return (
                                            <div 
                                                key={opt.id} 
                                                onClick={() => handleOptionToggle(p, opt)}
                                                className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all duration-200 group 
                                                    ${isSelected 
                                                        ? 'bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    {/* Selection Indicator */}
                                                    <div className={`
                                                        w-5 h-5 flex items-center justify-center border transition-all duration-200 flex-shrink-0
                                                        ${isSingleSelect ? 'rounded-full' : 'rounded-md'}
                                                        ${isSelected 
                                                            ? 'border-emerald-500 bg-emerald-500 text-white' 
                                                            : 'border-gray-500 bg-transparent group-hover:border-gray-400'}
                                                    `}>
                                                        {isSelected && (
                                                            isSingleSelect 
                                                                ? <div className="w-2 h-2 bg-white rounded-full shadow-sm" /> 
                                                                : <IconCheck className="h-3.5 w-3.5" />
                                                        )}
                                                    </div>
                                                    
                                                    <span className={`text-sm transition-colors ${isSelected ? 'text-white font-medium' : 'text-gray-300 group-hover:text-gray-200'}`}>
                                                        {opt.name}
                                                    </span>
                                                </div>
                                                
                                                {opt.price > 0 && (
                                                    <span className={`text-sm font-medium ${isSelected ? 'text-emerald-400' : 'text-gray-500'}`}>
                                                        +${opt.price.toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary Section */}
                    {allSelectedOptions.length > 0 && (
                        <div className="mt-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700 animate-fade-in">
                            <h4 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider flex justify-between items-center">
                                Resumen de extras
                                <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px]">
                                    {allSelectedOptions.length} seleccionados
                                </span>
                            </h4>
                            <div className="space-y-2 mb-3">
                                {allSelectedOptions.map((opt, idx) => (
                                    <div key={`${opt.id}-${idx}`} className="flex justify-between text-sm items-center">
                                        <span className="text-gray-300">{opt.name}</span>
                                        <span className="text-emerald-400 font-medium font-mono">
                                            {opt.price > 0 ? `+$${opt.price.toFixed(2)}` : 'Gratis'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-3 border-t border-gray-700 flex justify-between items-center">
                                <span className="text-sm font-bold text-white">Total extras</span>
                                <span className="text-emerald-400 font-bold font-mono">+${totalOptionsPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="mt-6">
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Instrucciones especiales</label>
                        <textarea 
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            rows={3}
                            className="w-full p-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                            placeholder="Ej. Sin cebolla, salsa aparte..."
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-3xl sm:rounded-b-2xl safe-bottom">
                    <div className="flex items-center justify-between gap-4 mb-4">
                         <span className="text-gray-400 font-medium">Cantidad</span>
                         <div className="flex items-center gap-6 bg-gray-800 rounded-full px-2 py-1 border border-gray-700">
                            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconMinus className="h-5 w-5"/></button>
                            <span className="font-bold text-xl text-white w-6 text-center">{quantity}</span>
                            <button onClick={() => setQuantity(q => q + 1)} className="p-2 rounded-full hover:bg-gray-700 text-white transition-colors"><IconPlus className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <button 
                        onClick={handleAdd}
                        className="w-full font-bold py-4 px-6 rounded-xl transition-all transform active:scale-[0.98] shadow-lg flex justify-between items-center bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-900/20"
                    >
                        <span>Agregar al pedido</span>
                        <span>${totalPrice.toFixed(2)}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
