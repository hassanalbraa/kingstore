"use client";

import { useEffect, useRef } from 'react';

interface TawkToProps {
    propertyId: string;
    widgetId: string;
}

const TawkTo = ({ propertyId, widgetId }: TawkToProps) => {
    const tawkToScriptAdded = useRef(false);

    useEffect(() => {
        // Prevent script from being added multiple times, e.g., during hot reloads in dev
        if (tawkToScriptAdded.current) {
            return;
        }

        const s1 = document.createElement("script");
        s1.async = true;
        s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        document.body.appendChild(s1);

        tawkToScriptAdded.current = true;

        // Clean up the script when the component unmounts
        return () => {
            if (document.body.contains(s1)) {
                document.body.removeChild(s1);
            }
            tawkToScriptAdded.current = false;
        };
    }, [propertyId, widgetId]);

    return null; // This component doesn't render anything itself
};

export default TawkTo;
