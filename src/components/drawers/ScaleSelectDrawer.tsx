import React, { useState, useEffect, useRef } from 'react'
import Drawer, { DrawerHeader, DrawerProps } from '$/components/drawers/Drawer'
import styled from '@emotion/styled'
import tw from 'twin.macro'
import { Scale } from '$/api/models/Scale'
import ListItem from '../ListItem'

// Styled container to ensure consistent padding - matches other drawers
const DrawerContent = styled.div`
    ${tw`px-14`}
`;

// Styled empty state message to match app design language
const StatusMessage = styled.div`
    ${tw`py-8 text-center text-lighter-grey font-medium text-base`}
`;

interface ScaleSelectDrawerProps extends Pick<DrawerProps, 'onReject'> {
    scanFn: () => Promise<void>;
    fetchFn: () => Promise<Scale[]>;
    onSelect: (scaleId: string) => Promise<void>;
}

export default function ScaleSelectDrawer({ 
    onReject, 
    scanFn,
    fetchFn,
    onSelect 
}: ScaleSelectDrawerProps) {
    const [isSearching, setIsSearching] = useState(true);
    const [foundScales, setFoundScales] = useState<Scale[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        let isMounted = true;
        setIsSearching(true);
        setFoundScales([]); // Clear previous results

        // Start 5 second timeout
        timeoutRef.current = setTimeout(() => {
            if (isMounted) {
                console.log('Scale search timed out after 5 seconds.');
                setIsSearching(false); // Stop searching state
            }
        }, 5000);

        const performScanAndFetch = async () => {
            try {
                await scanFn(); // Perform the scan
                const scales = await fetchFn(); // Fetch results
                
                if (isMounted) {
                    setFoundScales(scales);
                    clearTimeout(timeoutRef.current!); // Clear timeout if successful
                    timeoutRef.current = null;
                    setIsSearching(false);
                }
            } catch (error) {
                console.error('Error during scale scan/fetch:', error);
                if (isMounted) {
                    setIsSearching(false); // Stop searching on error
                    clearTimeout(timeoutRef.current!); 
                    timeoutRef.current = null;
                }
            }
        };

        performScanAndFetch();

        return () => {
            isMounted = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [scanFn, fetchFn]); // Rerun effect if functions change

    const handleSelect = async (scaleId: string) => {
        try {
            await onSelect(scaleId)
            if (onReject) {
                onReject(scaleId) // Close drawer on selection
            }
        } catch (error) {
            console.error('Failed to select scale', error)
        }
    }

    const handleBack = () => {
        if (onReject) {
            onReject(undefined)
        }
    }

    return (
        <Drawer onReject={onReject}>
            <DrawerHeader title="Select Scale" />
            <DrawerContent>
                {isSearching ? (
                    <StatusMessage>Searching...</StatusMessage>
                ) : foundScales.length === 0 ? (
                    <StatusMessage>No scales found. Try scanning again.</StatusMessage>
                ) : (
                    <>
                        {foundScales.map((scale) => (
                            <ListItem
                                key={scale.id}
                                id={scale.id}
                                active={scale.connectionState === 'connected'}
                                onClick={() => handleSelect(scale.id)} // Pass scale.id directly
                            >
                                {scale.name} {scale.batteryLevel > 0 && `(${scale.batteryLevel}%)`}
                            </ListItem>
                        ))}
                    </>
                )}
                <Spacer />
                <ListItem
                    id="back"
                    onClick={handleBack}
                >
                    Back
                </ListItem>
            </DrawerContent>
        </Drawer>
    )
}

// Spacer component to add consistent spacing before back button
const Spacer = styled.div`
    ${tw`mt-8`}
`; 