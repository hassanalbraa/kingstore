"use client";

import { useEffect } from 'react';

interface TawkToProps {
    propertyId: string;
    widgetId: string;
}

const TawkTo = ({ propertyId, widgetId }: TawkToProps) => {
    useEffect(() => {
        // Ensure this code runs only in the browser
        if (typeof window === 'undefined') {
            return;
        }

        // Create a script element
        const s1 = document.createElement("script");
        s1.async = true;
        s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        
        // Append the script to the body
        document.body.appendChild(s1);

        // Clean up the script when the component unmounts
        return () => {
            // Find the script and remove it to prevent memory leaks and issues on re-renders
            const script = document.querySelector(`script[src="https://embed.tawk.to/${propertyId}/${widgetId}"]`);
            if (script && document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, [propertyId, widgetId]); // Re-run effect if props change

    return null; // This component doesn't render anything itself
};

export default TawkTo;
