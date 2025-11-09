
"use client";

import { useEffect } from 'react';

interface TawkToProps {
    propertyId: string;
    widgetId: string;
}

const TawkTo = ({ propertyId, widgetId }: TawkToProps) => {
    useEffect(() => {
        // Ensure this code runs only on the client side
        if (typeof window !== 'undefined') {
            // Define Tawk_API and Tawk_LoadStart on the window object
            (window as any).Tawk_API = (window as any).Tawk_API || {};
            (window as any).Tawk_LoadStart = new Date();

            // Create a script element
            const script = document.createElement("script");
            script.async = true;
            script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
            script.charset = 'UTF-8';
            script.setAttribute('crossorigin', '*');

            // Append the script to the body
            document.body.appendChild(script);

            // Cleanup function to remove the script when the component unmounts
            return () => {
                // Optional: You might not want to remove it on unmount if you want it to persist across pages
                // document.body.removeChild(script);
            };
        }
    }, [propertyId, widgetId]); // Re-run effect if props change

    return null; // This component doesn't render anything itself
};

export default TawkTo;
