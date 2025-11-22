import { useState, useMemo } from 'react';
import { CartItem, Product, PersonalizationOption } from '../types';

export const useCart = () => {
    const [cartItems, setCartItems] = useState<CartItem[]>([]);

    const addToCart = (product: Product, quantity: number = 1, comments?: string, options: PersonalizationOption[] = []) => {
        setCartItems(prevItems => {
            const newItem: CartItem = {
                ...product,
                quantity,
                comments,
                selectedOptions: options,
                cartItemId: `${product.id}-${Date.now()}` // Create a unique ID for this specific cart instance
            };
            return [...prevItems, newItem];
        });
    };

    const removeFromCart = (cartItemId: string) => {
        setCartItems(prevItems => prevItems.filter(item => item.cartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(cartItemId);
        } else {
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.cartItemId === cartItemId ? { ...item, quantity } : item
                )
            );
        }
    };
    
    const updateComments = (cartItemId: string, comments: string) => {
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.cartItemId === cartItemId ? { ...item, comments } : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartTotal = useMemo(() => {
        return cartItems.reduce((total, item) => {
            const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0) : 0;
            return total + (item.price + optionsPrice) * item.quantity;
        }, 0);
    }, [cartItems]);

    return {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateComments,
        clearCart,
        cartTotal,
        itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    };
};