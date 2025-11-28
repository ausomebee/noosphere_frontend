import { useEffect, useRef } from 'react';

export default function usePortal() {
    const elRef = useRef(null);

    useEffect(() => {
        if (!elRef.current) {
            elRef.current = document.createElement('div');
            document.body.appendChild(elRef.current);
        }
        return () => {
            if (elRef.current && elRef.current.parentNode === document.body) {
                document.body.removeChild(elRef.current);
            }
        };
    }, []);

    return elRef.current;
}