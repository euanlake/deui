import React, { ReactNode, useEffect, useRef } from 'react'
import tw from 'twin.macro'
import { css } from '@emotion/react'
import { useDataStore } from '$/stores/data'
import axios from 'axios'
import { useServerUrl } from '$/hooks'

export default function ProfilesView() {
    const {
        profiles,
        remoteState: { profileId },
        loadProfilesFromFiles,
    } = useDataStore()

    const url = useServerUrl({ protocol: 'http' })
    
    // Load profiles from files when the component mounts
    useEffect(() => {
        loadProfilesFromFiles();
    }, [loadProfilesFromFiles]);

    return (
        <>
            {profiles.map(({ id, title }) => (
                <Item
                    key={id}
                    id={id}
                    onClick={async () => {
                        try {
                            // Find the profile in the profiles array
                            const selectedProfile = profiles.find(profile => profile.id === id);
                            if (!selectedProfile) {
                                console.error(`Profile with id ${id} not found`);
                                return;
                            }
                            
                            // Ensure profile has the correct format for the API
                            const formattedProfile = {
                                ...selectedProfile,
                                // Ensure version is a string as required by the API
                                version: typeof selectedProfile.version === 'number' 
                                    ? selectedProfile.version.toString() 
                                    : selectedProfile.version || '1.0',
                            };
                            
                            // Only include fields that the API expects
                            const apiProfile = {
                                title: formattedProfile.title,
                                author: formattedProfile.author || 'User',
                                notes: formattedProfile.notes || '',
                                beverage_type: formattedProfile.beverage_type || 'espresso',
                                version: formattedProfile.version,
                                steps: formattedProfile.steps || [],
                                target_volume: formattedProfile.target_volume,
                                target_weight: formattedProfile.target_weight,
                                target_volume_count_start: formattedProfile.target_volume_count_start,
                                tank_temperature: formattedProfile.tank_temperature
                            };
                            
                            console.log('Sending profile to DE1:', apiProfile);
                            
                            // Send the profile to the DE1 using the API v1 endpoint
                            await axios.post(`${url}/api/v1/de1/profile`, apiProfile);
                            console.log(`Sent profile ${id} to DE1`);
                            
                            // Update the profileId in the store
                            useDataStore.setState(state => ({
                                remoteState: {
                                    ...state.remoteState,
                                    profileId: id
                                }
                            }));
                            console.log(`Updated profileId in store to: ${id}`);
                        } catch (error) {
                            console.error('Error sending profile to DE1:', error);
                        }
                    }}
                    active={id === profileId}
                >
                    {title}
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
