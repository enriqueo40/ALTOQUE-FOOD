import { useState, useEffect, useCallback } from 'react';

export function usePersistentState<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const getStoredValue = useCallback((): T => {
        try {
            const item = window.localStorage.getItem(key);
            if (item === null) {
                window.localStorage.setItem(key, JSON.stringify(initialValue));
                return initialValue;
            }
            return JSON.parse(item);
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    }, [key, initialValue]);

    const [storedValue, setStoredValue] = useState<T>(getStoredValue);

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    };
    
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key === key && event.newValue) {
                 try {
                    setStoredValue(JSON.parse(event.newValue));
                } catch(e) {
                    console.warn(`Error parsing storage event value for key "${key}":`, e);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key]);

    return [storedValue, setValue];
}
