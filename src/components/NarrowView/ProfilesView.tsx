import React, { ReactNode, useEffect, useRef, useState } from 'react'
import tw from 'twin.macro'
import { css } from '@emotion/react'
import { useDataStore } from '$/stores/data'
import { StorageKey } from '$/shared/types'

// Styled components for the different states
const StatusMessage = tw.div`p-4 text-light-grey`
const ErrorMessage = tw.div`p-4 text-red`

export default function ProfilesView() {
    const {
        profiles,
        profileId,
        loadProfilesFromFiles,
        uploadProfile
    } = useDataStore()
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Load profiles from files when the component mounts
    useEffect(() => {
        console.log("ProfilesView mounted, loading profiles...");
        setLoading(true);
        
        const loadProfiles = async () => {
            try {
                await loadProfilesFromFiles();
                console.log("Profiles loaded:", profiles.length);
                setError(null);
            } catch (err) {
                console.error("Error loading profiles:", err);
                setError("Failed to load profiles");
            } finally {
                setLoading(false);
            }
        };
        
        loadProfiles();
    }, [loadProfilesFromFiles]);
    
    // Debug log when profiles or profileId changes
    useEffect(() => {
        console.log("Profiles updated:", profiles.length, "Current profileId:", profileId);
    }, [profiles, profileId]);

    if (loading) {
        return <StatusMessage>Loading profiles...</StatusMessage>;
    }
    
    if (error) {
        return <ErrorMessage>{error}</ErrorMessage>;
    }
    
    if (profiles.length === 0) {
        return <StatusMessage>No profiles available</StatusMessage>;
    }

    return (
        <>
            {profiles.filter(profile => profile && profile.id).map(profile => (
                <Item
                    key={profile.id}
                    id={profile.id || ''}
                    onClick={async () => {
                        try {
                            console.log("Selecting profile:", profile.id);
                            
                            // Upload profile using the data store method
                            await uploadProfile(profile);
                            
                            // Update the profileId in the store directly
                            useDataStore.setState({ profileId: profile.id });
                            
                            // Save to localStorage for persistence across sessions
                            if (profile.id) {
                                localStorage.setItem(StorageKey.LastUsedProfile, profile.id);
                            }
                            
                            console.log("Profile selected:", profile.id);
                        } catch (error) {
                            console.error('Error uploading profile:', error);
                        }
                    }}
                    active={profile.id === profileId}
                >
                    {profile.title || profile.id}
                </Item>
            ))}
        </>
    )
}

type ItemProps = {
    children?: ReactNode
    id: string
    onClick?: (profileId: string) => void
    active?: boolean
}

function Item({ id, children, onClick: onClickProp, active }: ItemProps) {
    const idRef = useRef(id)

    useEffect(() => {
        idRef.current = id
    }, [id])

    const onClickRef = useRef(onClickProp)

    useEffect(() => {
        onClickRef.current = onClickProp
    }, [onClickProp])

    const { current: onClick } = useRef(() => {
        if (typeof onClickRef.current === 'function') {
            onClickRef.current(idRef.current)
        }
    })

    return (
        <button
            onClick={onClick}
            type="button"
            css={[
                css`
                    -webkit-tap-highlight-color: transparent;
                    grid-template-columns: 4px 1fr;
                    gap: 52px;
                `,
                tw`
                    items-center
                    grid
                    appearance-none
                    text-t1
                    h-16
                    w-full
                    text-left
                    text-light-grey
                    dark:text-medium-grey
                    pr-14
                `,
                active === true &&
                    tw`
                        text-dark-grey
                        dark:text-lighter-grey
                    `,
            ]}
        >
            <div
                css={[
                    tw`
                        invisible
                        h-6
                        w-1
                        bg-dark-grey
                        dark:bg-lighter-grey
                    `,
                    active === true &&
                        tw`
                            visible
                        `,
                ]}
            />
            <div
                css={tw`
                    truncate
                `}
            >
                {children}
            </div>
        </button>
    )
}
