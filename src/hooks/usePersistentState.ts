
import { useState, useEffect, useCallback, useRef } from 'react';

export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const isFirstRender = useRef(true);

    const getStoredValue = useCallback((): T => {
        if (typeof window === 'undefined') return initialValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    }, [key, initialValue]);

    const [storedValue, setStoredValue] = useState<T>(initialValue);

    // Inicialización post-hidratación para evitar desajustes en SSR/Hydration
    useEffect(() => {
        if (isFirstRender.current) {
            const val = getStoredValue();
            setStoredValue(val);
            isFirstRender.current = false;
        }
    }, [getStoredValue]);

    const setValue = useCallback((value: T | ((val: T) => T)) => {
        setStoredValue(prev => {
            const valueToStore = value instanceof Function ? value(prev) : value;
            try {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
                // Disparar evento manual para que otras pestañas reaccionen
                window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
            return valueToStore;
        });
    }, [key]);
    
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === key && event.newValue) {
                 try {
                    const parsed = JSON.parse(event.newValue);
                    setStoredValue(parsed);
                } catch(e) {}
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue];
}
